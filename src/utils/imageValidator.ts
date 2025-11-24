import { KycImageValidationResult } from '../types/dataModels';

/**
 * Client-side image validation utility for KYC verification
 * Validates image quality before upload to minimize server load
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const MIN_BRIGHTNESS = 40; // on 0-255 scale
const MIN_SHARPNESS = 10; // variance-based score

/**
 * Validates an image file for KYC submission
 * @param file - The file to validate (from ImagePicker or Camera)
 * @returns Validation result with ok flag and message
 */
export async function validateKycImage(file: {
  uri: string;
  type?: string;
  size?: number;
}): Promise<KycImageValidationResult> {
  // Check file type
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      ok: false,
      message: 'JPEG/PNG/WebP の画像をアップロードしてください。',
    };
  }

  // Check file size
  if (file.size && file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      message: 'ファイルサイズは10MB以下にしてください。',
    };
  }

  // Load image to check dimensions and quality
  try {
    const img = await loadImage(file.uri);
    
    if (!img) {
      return {
        ok: false,
        message: '画像の読み込みに失敗しました。',
      };
    }

    // Check dimensions
    if (img.width < MIN_WIDTH || img.height < MIN_HEIGHT) {
      return {
        ok: false,
        message: '画像の解像度が低すぎます。より鮮明な写真を使用してください（推奨 幅 >= 400px）。',
      };
    }

    // Check brightness
    const brightness = estimateBrightness(img);
    if (brightness < MIN_BRIGHTNESS) {
      return {
        ok: false,
        message: '写真が暗すぎます。明るい自然光の下で再撮影してください。',
      };
    }

    // Check sharpness
    const sharpness = estimateSharpness(img);
    if (sharpness < MIN_SHARPNESS) {
      return {
        ok: false,
        message: '画像がぼやけています。手ぶれがない鮮明な写真をアップロードしてください。',
      };
    }

    return {
      ok: true,
      message: 'ローカルチェックを通過しました。',
    };
  } catch (error) {
    return {
      ok: false,
      message: '画像の検証中にエラーが発生しました。',
    };
  }
}

/**
 * Load image from URI
 */
function loadImage(uri: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

/**
 * Estimate image brightness by calculating average luminance
 */
function estimateBrightness(image: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  const width = Math.min(200, image.width);
  const height = Math.min(150, image.height);
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Calculate luminance using standard coefficients
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    total += luminance;
  }
  
  const average = total / (width * height);
  return Math.round(average);
}

/**
 * Estimate image sharpness by measuring variance of luminance
 */
function estimateSharpness(image: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  const width = 100;
  const height = Math.round((image.height / image.width) * 100);
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  
  ctx.drawImage(image, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Calculate luminance values
  const values: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    values.push(luminance);
  }
  
  // Calculate variance (proxy for sharpness)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / values.length;
  
  return Math.round(variance / 10); // scaled estimate
}
