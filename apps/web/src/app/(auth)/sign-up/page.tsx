import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@levelup/ui';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = {
  title: 'Create your organization',
};

export default function SignUpPage() {
  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Create your organization on LevelUp</CardTitle>
          <CardDescription>
            Set up your workspace. Your team will be invited after you sign in.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <SignUpForm />
        </CardContent>

        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Sign in →
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
