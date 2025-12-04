'use client';

import { useEffect, useState } from 'react';
import { commands } from '@/lib/bindings';
import { error as logError } from '@tauri-apps/plugin-log';
import { User } from 'lucide-react';

interface UserProfileProps {
  streamerMode: boolean;
}

export function UserProfile({ streamerMode }: UserProfileProps) {
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [isPatreon, setIsPatreon] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get current user info
        const userResult = await commands.getCurrentUser();
        if (userResult.status === 'ok') {
          setUsername(userResult.data.username);
          setUserId(userResult.data.user_id);

          // Check if user is a Patreon supporter
          const patreonResult = await commands.fetchPatreonData();
          if (patreonResult.status === 'ok') {
            const isSupporter =
              patreonResult.data.platinumSupporter.includes(
                userResult.data.user_id,
              ) ||
              patreonResult.data.goldSupporter.includes(
                userResult.data.user_id,
              ) ||
              patreonResult.data.silverSupporter.includes(
                userResult.data.user_id,
              ) ||
              patreonResult.data.bronzeSupporter.includes(
                userResult.data.user_id,
              ) ||
              patreonResult.data.basicSupporter.includes(
                userResult.data.user_id,
              );
            setIsPatreon(isSupporter);
          }
        }
      } catch (e) {
        logError(`Failed to load user data: ${e}`);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  if (loading || streamerMode || !username) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-t border-border/40">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent/50">
          <User className="h-4 w-4" />
        </div>
        <span
          className={`font-medium truncate ${isPatreon ? 'text-pink-500' : ''}`}
        >
          {username}
        </span>
      </div>
    </div>
  );
}
