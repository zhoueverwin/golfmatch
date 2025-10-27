/**
 * Filter Options Constants
 * Contains all the filter options for the search/filter functionality
 */

// ============================================================================
// PREFECTURE OPTIONS (47 Japanese Prefectures)
// ============================================================================
export const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
] as const;

// ============================================================================
// GOLF SKILL LEVEL OPTIONS
// ============================================================================
export const SKILL_LEVELS = [
  { value: "ビギナー", label: "ビギナー" },
  { value: "中級者", label: "中級者" },
  { value: "上級者", label: "上級者" },
  { value: "プロ", label: "プロ" },
] as const;

// ============================================================================
// AGE DECADE OPTIONS
// ============================================================================
export const AGE_DECADES = [
  { value: 20, label: "20代", ageMin: 20, ageMax: 29 },
  { value: 30, label: "30代", ageMin: 30, ageMax: 39 },
  { value: 40, label: "40代", ageMin: 40, ageMax: 49 },
  { value: 50, label: "50代", ageMin: 50, ageMax: 59 },
  { value: 60, label: "60代", ageMin: 60, ageMax: 69 },
  { value: 70, label: "70代以上", ageMin: 70, ageMax: 120 },
] as const;

// ============================================================================
// AVERAGE SCORE OPTIONS (Maximum score filter)
// ============================================================================
export const SCORE_OPTIONS = [
  { value: 80, label: "80以下" },
  { value: 90, label: "90以下" },
  { value: 100, label: "100以下" },
  { value: 110, label: "110以下" },
  { value: 120, label: "120以下" },
  { value: 130, label: "130以下" },
  { value: 999, label: "指定しない" },
] as const;

// ============================================================================
// LAST LOGIN OPTIONS (Activity filter)
// ============================================================================
export const LAST_LOGIN_OPTIONS = [
  { value: 1, label: "24時間以内" },
  { value: 3, label: "3日以内" },
  { value: 7, label: "7日以内" },
  { value: 30, label: "30日以内" },
  { value: null, label: "指定しない" },
] as const;

// ============================================================================
// FILTER LABELS (for display)
// ============================================================================
export const FILTER_LABELS = {
  prefecture: "居住地",
  ageDecade: "年齢",
  skillLevel: "ゴルフレベル",
  averageScore: "平均スコア",
  lastLogin: "最終ログイン",
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert age decades to age range
 * @param decades Array of decade values (e.g., [20, 30])
 * @returns Object with age_min and age_max
 */
export function decadesToAgeRange(decades: number[]): {
  age_min: number;
  age_max: number;
} | null {
  if (!decades || decades.length === 0) return null;

  const sortedDecades = [...decades].sort((a, b) => a - b);
  const minDecade = AGE_DECADES.find((d) => d.value === sortedDecades[0]);
  const maxDecade = AGE_DECADES.find(
    (d) => d.value === sortedDecades[sortedDecades.length - 1]
  );

  if (!minDecade || !maxDecade) return null;

  return {
    age_min: minDecade.ageMin,
    age_max: maxDecade.ageMax,
  };
}

/**
 * Get label for selected prefecture
 */
export function getPrefectureLabel(prefecture: string | undefined): string {
  if (!prefecture) return "未指定";
  return prefecture;
}

/**
 * Get label for selected skill level
 */
export function getSkillLevelLabel(skillLevel: string | undefined): string {
  if (!skillLevel) return "未指定";
  const skill = SKILL_LEVELS.find((s) => s.value === skillLevel);
  return skill ? skill.label : "未指定";
}

/**
 * Get label for selected age decades
 */
export function getAgeDecadesLabel(decades: number[] | undefined): string {
  if (!decades || decades.length === 0) return "未指定";
  const labels = decades
    .sort((a, b) => a - b)
    .map((d) => AGE_DECADES.find((age) => age.value === d)?.label)
    .filter(Boolean);
  return labels.join(", ");
}

/**
 * Get label for selected score
 */
export function getScoreLabel(score: number | undefined): string {
  if (!score || score === 999) return "未指定";
  return `${score}以下`;
}

/**
 * Get label for last login days
 */
export function getLastLoginLabel(days: number | null | undefined): string {
  if (days === null || days === undefined) return "未指定";
  const option = LAST_LOGIN_OPTIONS.find((opt) => opt.value === days);
  return option ? option.label : "未指定";
}

