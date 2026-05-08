'use client';

import { useState, useTransition } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  toast,
} from '@levelup/ui';
import { users } from '@/lib/api';

interface EditProfileFormProps {
  initialName: string;
}

export function EditProfileForm({ initialName }: EditProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await users.updateMe({ name: name.trim() });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast({ title: 'Profile updated' });
      } catch {
        toast({ title: 'Update failed', description: 'Please try again.', variant: 'destructive' });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit profile</CardTitle>
        <CardDescription>Update your display name.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              maxLength={80}
              className="max-w-sm"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
            {saved && <span className="text-sm text-paper-300">Saved.</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
