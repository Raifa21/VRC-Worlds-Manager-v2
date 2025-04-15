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
import { useLocalization } from '@/hooks/use-localization';

export default function Login() {
  const router = useRouter();
  const { t } = useLocalization();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [twoFactorCodeType, setTwoFactorCodeType] = useState('emailOtp');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const handleLogin = async () => {
    const result = await commands.loginWithCredentials(username, password);

    if (result.status === 'error') {
      // Only set error if it's not a 2FA-related error
      if (result.error?.includes('2fa-required')) {
        setShow2FA(true);
        setError(null);
        setTwoFactorCodeType('totp');
      } else {
        setError(result.error || t('login-page:error-invalid-credentials'));
      }
      return;
    }

    const status = result.data;

    // Let's add some debug logging
    console.log('Login status:', status);

    // Check 2FA status and set dialog accordingly
    if (status === 'twoFactorAuth' || status === 'email2FA') {
      setShow2FA(true);
      setError(null);
      setTwoFactorCodeType(status === 'twoFactorAuth' ? 'totp' : 'emailOtp');
    } else if (status === 'loggedIn') {
      router.push('/listview');
    }
  };

  const handle2FA = async () => {
    try {
      const result = await commands.loginWith2fa(
        twoFactorCode,
        twoFactorCodeType,
      );

      if (result.status === 'error') {
        setError(result.error || t('login-page:error-invalid-2fa'));
        return;
      }
      router.push('/listview');
    } catch (err) {
      setError((err as string) || t('login-page:error-invalid-2fa'));
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-center">
          {t('login-page:title')}
        </h2>
        <div className="space-y-4">
          <Input
            type="text"
            placeholder={t('login-page:username-placeholder')}
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
            placeholder={t('login-page:password-placeholder')}
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
            {t('login-page:login-button')}
          </Button>

          <div className="mt-4 p-4 border-2 border-red-500 rounded-md">
            <p className="text-sm text-center">
              <span className="font-bold">{t('login-page:notice-title')}</span>{' '}
              {t('login-page:notice-text')}
            </p>
            <p className="text-xs text-center mt-2">
              {t('login-page:terms-text')}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={show2FA} onOpenChange={setShow2FA}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('login-page:2fa-title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder={t('login-page:2fa-placeholder')}
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
              {t('login-page:2fa-button')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
