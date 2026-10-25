import { Share } from '@capacitor/share';

export class NativeShareService {
  static async shareText(title: string, text: string, dialogTitle: string = 'Share Report') {
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
      // fallback to navigator.share or clipboard
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text });
        return true;
      } catch {
        // user cancelled or failed
      }
    }

    // Fallback: copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert(title.includes('تقرير') ? 'تم نسخ التقرير إلى الحافظة' : 'Report copied to clipboard');
        return true;
      } catch {
        // ignore
      }
    }

    return false;
  }

  static async shareFile(fileName: string, content: string, mimeType: string = 'text/csv') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);

    // Try Web Share with files if supported
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const file = new File([blob], fileName, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: fileName,
          });
          URL.revokeObjectURL(url);
          return true;
        } catch {
          // cancelled or failed
        }
      }
    }

    // Direct download trigger (saves to iOS Files or Downloads)
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }
}
