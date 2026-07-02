/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RaceRecord } from '../types';

/**
 * Parses raw Google Sheets Published TSV text into typed RaceRecords using Columns A to I:
 * MATCH ID | STT | USER ID | CU LY | GIOI TINH | SO TIEN | MA GIAM GIA | PARTNER | THOI GIAN TAO
 */
export function parseTSV(tsvText: string): RaceRecord[] {
  const lines = tsvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const records: RaceRecord[] = [];
  
  const headers = lines[0].split('\t').map(h => h.trim().toUpperCase());
  
  let matchIdIdx = headers.indexOf('MATCH ID');
  let sttIdx = headers.indexOf('STT');
  let userIdIdx = headers.indexOf('USER ID');
  let distanceIdx = headers.indexOf('CU LY');
  let genderIdx = headers.indexOf('GIOI TINH');
  let amountIdx = headers.indexOf('SO TIEN');
  let promoIdx = headers.indexOf('MA GIAM GIA');
  let partnerIdx = headers.indexOf('PARTNER');
  let timeIdx = headers.indexOf('THOI GIAN TAO');
  let ageGroupIdx = headers.findIndex(h => h.includes('TUOI') || h.includes('AGE') || h.includes('OLD') || h.includes('YEAR'));

  // Specialized columns for live Google Sheets integration
  const namIdx = headers.indexOf('NAM');
  const nuIdx = headers.indexOf('NU');
  const namSinhIdx = headers.indexOf('NAM SINH');

  // Static Fallbacks if headers are absent or slightly different
  if (matchIdIdx === -1) matchIdIdx = 0;
  if (sttIdx === -1) sttIdx = 1;
  if (userIdIdx === -1) userIdIdx = 2;
  if (distanceIdx === -1) distanceIdx = 3;
  if (genderIdx === -1 && namIdx === -1 && nuIdx === -1) genderIdx = 4;
  if (amountIdx === -1) amountIdx = 5;
  if (promoIdx === -1) promoIdx = 6;
  if (partnerIdx === -1) partnerIdx = 7;
  if (timeIdx === -1) timeIdx = 8;
  if (ageGroupIdx === -1 && namSinhIdx === -1) ageGroupIdx = 9;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = line.split('\t');
    if (cells.length === 0) continue;

    const rawMatchId = matchIdIdx !== -1 ? cells[matchIdIdx]?.trim() || '' : '';
    const rawStt = sttIdx !== -1 ? cells[sttIdx]?.trim() || '' : '';
    const rawUserId = userIdIdx !== -1 ? cells[userIdIdx]?.trim() || '' : '';
    const rawDistance = distanceIdx !== -1 ? cells[distanceIdx]?.trim() || '' : '';
    const rawAmount = amountIdx !== -1 ? cells[amountIdx]?.trim() || '' : '';
    const rawPromoCode = promoIdx !== -1 ? cells[promoIdx]?.trim() || '' : '';
    const rawPartner = partnerIdx !== -1 ? cells[partnerIdx]?.trim() || '' : '';
    const rawCreatedAt = timeIdx !== -1 ? cells[timeIdx]?.trim() || '' : '';

    // Calculate Gender
    let cleanGender = '(Trống)';
    if (namIdx !== -1 || nuIdx !== -1) {
      const isNam = namIdx !== -1 && cells[namIdx]?.trim().toLowerCase() === 'x';
      const isNu = nuIdx !== -1 && cells[nuIdx]?.trim().toLowerCase() === 'x';
      if (isNam) {
        cleanGender = 'Nam';
      } else if (isNu) {
        cleanGender = 'Nữ';
      }
    } else if (genderIdx !== -1) {
      cleanGender = cells[genderIdx]?.trim() || '(Trống)';
    }

    // Calculate Age Group from NAM SINH
    let cleanAgeGroup = '(Trống)';
    if (namSinhIdx !== -1) {
      const rawNamSinh = cells[namSinhIdx]?.trim() || '';
      const match = rawNamSinh.match(/\b(19\d\d|20\d\d)\b/);
      let birthYear = 0;
      if (match) {
        birthYear = parseInt(match[1], 10);
      } else {
        const yearOnly = parseInt(rawNamSinh, 10);
        if (yearOnly >= 1900 && yearOnly <= 2026) {
          birthYear = yearOnly;
        }
      }

      if (birthYear > 0) {
        const age = 2026 - birthYear;
        if (age >= 6 && age <= 17) cleanAgeGroup = '6-17';
        else if (age >= 18 && age <= 24) cleanAgeGroup = '18-24';
        else if (age >= 25 && age <= 34) cleanAgeGroup = '25-34';
        else if (age >= 35 && age <= 44) cleanAgeGroup = '35-44';
        else if (age >= 45 && age <= 54) cleanAgeGroup = '45-54';
        else if (age >= 55) cleanAgeGroup = '55+';
      }
    } else if (ageGroupIdx !== -1) {
      const rawAgeGroup = cells[ageGroupIdx]?.trim() || '';
      cleanAgeGroup = rawAgeGroup ? rawAgeGroup : '(Trống)';
    }

    // Skip empty lines with no essential content
    if (!rawUserId && !rawPromoCode && !rawPartner && !rawDistance) {
      continue;
    }

    const cleanPromoCode = rawPromoCode ? rawPromoCode : '(Trống)';
    const cleanPartner = rawPartner ? rawPartner : '(Trống)';
    const cleanDistance = rawDistance ? rawDistance : '(Trống)';

    // Safe Vietnamese Currency parsing: keep numeric digits only
    const moneyStr = rawAmount.replace(/[^0-9]/g, '');
    const amountNum = parseInt(moneyStr, 10) || 0;

    records.push({
      id: `record_${i}_${rawStt || i}`,
      matchId: rawMatchId,
      stt: rawStt || String(i),
      userId: rawUserId,
      distance: cleanDistance,
      gender: cleanGender,
      amount: amountNum,
      promoCode: cleanPromoCode,
      partner: cleanPartner,
      createdAt: rawCreatedAt,
      ageGroup: cleanAgeGroup
    });
  }

  return records;
}

/**
 * Exports records to a clean CSV formatted string for Excel compatibility, including BOM.
 */
export function exportToCSVString(records: RaceRecord[]): string {
  const bom = '\uFEFF';
  const headers = ['MATCH ID', 'STT', 'USER ID', 'CỰ LY', 'GIỚI TÍNH', 'SỐ TIỀN', 'MÃ GIẢM GIÁ', 'PARTNER', 'THỜI GIAN TẠO'];
  
  const csvLines = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')
  ];

  records.forEach(r => {
    const row = [
      r.matchId,
      r.stt,
      r.userId,
      r.distance,
      r.gender,
      r.amount.toString(),
      r.promoCode,
      r.partner,
      r.createdAt
    ];
    csvLines.push(row.map(value => `"${value?.replace(/"/g, '""') || ''}"`).join(','));
  });

  return bom + csvLines.join('\n');
}
