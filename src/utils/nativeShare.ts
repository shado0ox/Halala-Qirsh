import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { withSystemFlow } from './systemFlow';

export class NativeShareService {
  private static isNative(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    );
  }

  static async shareText(title: string, text: string, dialogTitle: string = 'Share Report'): Promise<boolean> {
    return withSystemFlow(async () => {
      try {
        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share({
            title,
            text,
            dialogTitle,
          });
          return true;
        }
      } catch {
        // fallback
      }

      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title, text });
          return true;
        } catch {
          // user cancelled
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // ignore
        }
      }

      return false;
    });
  }

  static async shareFile(fileName: string, content: string, mimeType: string = 'text/csv'): Promise<boolean> {
    return withSystemFlow(async () => {
      // 1. On Native iOS, save file to Cache directory using Filesystem, then pass file URI to Share sheet
      if (this.isNative()) {
        try {
          const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });

          await Share.share({
            title: fileName,
            url: writeResult.uri,
            dialogTitle: fileName,
          });
          return true;
        } catch (err) {
          console.error('Native Filesystem/Share failed:', err);
        }
      }

      // 2. Web Share API with File object
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: fileName,
            });
            return true;
          }
        } catch {
          // User cancelled or share failed
        }
      }

      // 3. Fallback: Browser download anchor
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
      } catch {
        return false;
      }
    });
  }
}
