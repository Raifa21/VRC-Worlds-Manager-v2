'use client';
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { commands } from '@/lib/bindings';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [twoFactorCodeType, setTwoFactorCodeType] = useState('emailOtp');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleLogin = async () => {
    const result = await commands.loginWithCredentials(username, password);

    if (result.status === 'error') {
      setError(result.error || 'Invalid credentials');
      return;
    }

    const status = result.data;

    if (status === 'loggedIn') {
      router.push('/listview');
    } else if (status === 'twoFactorAuth') {
      setShow2FA(true);
      setError(null);
      setTwoFactorCodeType('totp');
    } else if (status === 'email2FA') {
      setShow2FA(true);
      setError(null);
      setTwoFactorCodeType('emailOtp');
    }
  };

  const handle2FA = async () => {
    try {
      const result = await commands.loginWith2fa(
        twoFactorCode,
        twoFactorCodeType,
      );

      if (result.status === 'error') {
        setError(result.error || 'Invalid 2FA code');
        return;
      }

      const status = result.data;

      if (status === 'loggedIn') {
        router.push('/listview');
      } else if (status === 'twoFactorAuth') {
        setShow2FA(true);
        setError(null);
        setTwoFactorCodeType('totp');
      } else if (status === 'email2FA') {
        setShow2FA(true);
        setError(null);
        setTwoFactorCodeType('emailOtp');
      }
    } catch (err) {
      setError((err as string) || 'Invalid 2FA code');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center">Login to VRChat</h2>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Email / Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const passwordInput = document.querySelector(
                  'input[type="password"]',
                ) as HTMLInputElement;
                passwordInput?.focus();
              }
            }}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
              }
            }}
            // // パスワードが正しくてもペースト時はログインに失敗するためコメントアウト
            // // ペーストした結果が setPassword されるよりも先にログイン試行が走るため？
            // onPaste={handleLogin}
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!username || !password}
          >
            Login
          </Button>

          <div className="mt-4 p-4 border-2 border-red-500 rounded-md">
            <p className="text-sm text-center">
              <span className="font-bold">NOTICE:</span> We DO NOT store your
              login details. Your credentials are only used to communicate with
              VRChat&apos;s API, which is required to access world information.
            </p>
            <p className="text-xs text-center mt-2">
              By logging in, you agree to VRChat&apos;s Terms of Service and
              Community Guidelines.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={show2FA} onOpenChange={setShow2FA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Enter 2FA code"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handle2FA();
                }
              }}
            />
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <Button
              className="w-full"
              onClick={handle2FA}
              disabled={!twoFactorCode}
            >
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
