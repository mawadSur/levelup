import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@levelup/ui';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

interface SignInPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { redirect } = await searchParams;

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Sign in to LevelUp AI Academy</CardTitle>
          <CardDescription>Use the email associated with your work account.</CardDescription>
        </CardHeader>

        <CardContent>
          <SignInForm redirect={redirect} />
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            New to LevelUp?{' '}
            <Link
              href="/sign-up"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Create an organization →
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
