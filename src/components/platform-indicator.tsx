import PAndroid from '@/../public/icons/Platform_Android.svg';
import PIos from '@/../public/icons/Platform_iOS.svg';
import PWindows from '@/../public/icons/Platform_Windows.svg';
import Image from 'next/image';
import { useLocalization } from '@/hooks/use-localization';
import { Platform } from '@/lib/bindings';

export function PlatformIndicator({ platform }: { platform: Platform[] }) {
  const { t } = useLocalization();

  return (
    <div className="flex flex-row">
      {platform.includes('standalonewindows') && (
        <Image
          src={PWindows}
          alt={t('world-card:windows')}
          width={25}
          className={`${platform.includes('android') || platform.includes('ios') ? 'mr-[-10px] ' : ''}`}
        />
      )}
      {platform.includes('android') && (
        <Image
          src={PAndroid}
          alt={t('world-card:android')}
          width={25}
          className={`${platform.includes('ios') ? 'mr-[-10px] ' : ''}`}
        />
      )}
      {platform.includes('ios') && (
        <Image src={PIos} alt={t('world-card:ios')} width={25} />
      )}
    </div>
  );
}
