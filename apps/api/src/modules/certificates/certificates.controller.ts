/**
 * CertificatesController — T2.15
 *
 * Base path: /certificates
 *
 * Route ordering matters in NestJS / Express:
 *   - Static routes (`/me`, `/verify/:hash`) are declared BEFORE param routes
 *     (`:id`) so they are matched first.
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  Header,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getCertificateSignedUrl, isStubMode as isStorageStubMode } from '@levelup/storage';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { SessionPayload } from '@levelup/auth-client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CertificatesService } from './certificates.service';
import { PrismaService } from '../prisma';
import { issueCertificateSchema, type IssueCertificateDto } from './dto/issue-certificate.dto';
import { LocalFsCertStorage } from './cert-storage';

@Controller('certificates')
@UseGuards(AuthGuard, RoleGuard)
export class CertificatesController {
  private readonly logger = new Logger(CertificatesController.name);
  private readonly localStorage = new LocalFsCertStorage();

  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly prisma: PrismaService,
  ) {}

  // --------------------------------------------------------------------------
  // GET /certificates/me
  // --------------------------------------------------------------------------

  @Get('me')
  getMe(@CurrentUser() user: SessionPayload) {
    return this.certificatesService.getMyCertificates(user);
  }

  // --------------------------------------------------------------------------
  // GET /certificates/verify/:hash  — @Public, no auth required
  // --------------------------------------------------------------------------

  @Get('verify/:hash')
  @Public()
  verifyCertificate(@Param('hash') hash: string) {
    return this.certificatesService.verifyCertificate(hash);
  }

  // --------------------------------------------------------------------------
  // POST /certificates/issue  — ADMIN only
  // --------------------------------------------------------------------------

  @Post('issue')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  issueCertificate(
    @CurrentUser() user: SessionPayload,
    @Body(new ZodValidationPipe(issueCertificateSchema)) dto: IssueCertificateDto,
  ) {
    return this.certificatesService.issueCertificate(user, dto);
  }

  // --------------------------------------------------------------------------
  // GET /certificates/:id/download
  // Must be declared before /:id to avoid NestJS matching "download" as an id.
  // --------------------------------------------------------------------------

  @Get(':id/download')
  async getCertificateDownload(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Res() res: Response,
  ) {
    const result = await this.certificatesService.getCertificateDownload(id, user);

    if (result.status === 'generating') {
      res.status(HttpStatus.ACCEPTED).json({
        status: 'generating',
        tryAgainIn: result.tryAgainIn,
      });
      return;
    }

    // pdfUrl is set — check accept header: redirect or return JSON
    const acceptsJson = res.req.headers['accept']?.includes('application/json') ?? false;

    if (acceptsJson) {
      res.status(HttpStatus.OK).json({ pdfUrl: result.pdfUrl });
    } else {
      res.redirect(HttpStatus.FOUND, result.pdfUrl!);
    }
  }

  // --------------------------------------------------------------------------
  // GET /certificates/:id/file
  //
  // Real mode (Supabase Storage): mints a fresh 7-day signed URL from the
  //   certificate's storagePath and 302-redirects to it. The signed URL gives
  //   the client a direct, time-limited handle to the PDF in object storage —
  //   we do not proxy bytes through the API.
  //
  // Stub mode (no SUPABASE_SERVICE_ROLE_KEY): falls back to streaming from
  //   apps/api/.cert-output/<id>.pdf so the demo flow still works without
  //   external credentials.
  //
  // Legacy fallback: rows created before this migration (storagePath = null)
  //   continue to stream from local fs.
  // --------------------------------------------------------------------------

  @Get(':id/file')
  @Header('Content-Type', 'application/pdf')
  async streamCertificateFile(
    @Param('id') id: string,
    @CurrentUser() user: SessionPayload,
    @Res() res: Response,
  ) {
    // Re-use getCertificate for access control (owner/manager/admin check)
    await this.certificatesService.getCertificate(id, user);

    const cert = await this.prisma.certificate.findUnique({
      where: { id },
      select: { storagePath: true },
    });

    // Real-mode redirect path: storagePath set + Supabase configured.
    if (cert?.storagePath && !isStorageStubMode()) {
      const signedUrl = await getCertificateSignedUrl(cert.storagePath);
      res.redirect(HttpStatus.FOUND, signedUrl);
      return;
    }

    // Stub / legacy path: stream from local filesystem.
    const filePath = this.localStorage.getFilePath(id);
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      throw new NotFoundException('PDF not found. It may still be generating.');
    }

    const stat = await fs.promises.stat(filePath);
    const filename = path.basename(filePath);

    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      this.logger.error(`Stream error for cert ${id}: ${err.message}`);
      if (!res.headersSent) {
        throw new InternalServerErrorException('Error streaming PDF');
      }
    });

    stream.pipe(res);
  }

  // --------------------------------------------------------------------------
  // GET /certificates/:id  — declared LAST so static routes above take priority
  // --------------------------------------------------------------------------

  @Get(':id')
  getCertificate(@Param('id') id: string, @CurrentUser() user: SessionPayload) {
    return this.certificatesService.getCertificate(id, user);
  }
}
