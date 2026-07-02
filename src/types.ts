/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RaceRecord {
  id: string; // Unique generated client-side key
  matchId: string; // MATCH ID
  stt: string; // STT
  userId: string; // USER ID
  distance: string; // CU LY
  gender: string; // GIOI TINH
  amount: number; // SO TIEN
  promoCode: string; // MA GIAM GIA
  partner: string; // PARTNER
  createdAt: string; // THOI GIAN TAO
  ageGroup: string; // GROUP YEAR OLD / TUỔI
}

export interface PartnerDistanceBreakdown {
  distance: string;
  count: number;
  totalAmount: number;
}

export interface PartnerStat {
  name: string;
  count: number;
  percentage: number;
  totalAmount: number;
  distances: PartnerDistanceBreakdown[];
}

export interface PromoCodeStat {
  code: string;
  count: number;
  percentage: number;
  totalAmount: number;
  distanceBreakdown: Record<string, number>;
}
