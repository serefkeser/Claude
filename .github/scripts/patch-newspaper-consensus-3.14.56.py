from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:160]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


PATH = 'apps/web/src/lib/newspaperEvidenceVerification.ts'
TEST = 'apps/web/src/lib/newspaperEvidenceVerification.test.ts'

anchor = """export function hasLocalOcrDetailSupport(detail: string, ocrEvidence: string) {
  return hasLocalOcrTextSupport({
    expectedText: detail,
    ocrEvidence,
    minTokens: 4,
    maxLines: 8,
    minRecall: 0.62,
    minPrecision: 0.42,
  });
}

"""
insert = anchor + """function hasVisionHeadlineConsensus(discovered: string, verified: string) {
  const left = normalizeText(discovered);
  const right = normalizeText(verified);
  return Boolean(left) && left === right;
}

function visionDetailTokens(value: string) {
  return new Set(normalizeText(value).split(/\s+/).filter(token => token.length >= 2));
}

function hasVisionDetailConsensus(discovered: string, verified: string) {
  const left = visionDetailTokens(discovered);
  const right = visionDetailTokens(verified);
  if (left.size < 4 || right.size < 4) return false;

  const shared = [...left].filter(token => right.has(token)).length;
  const recall = shared / Math.max(1, Math.min(left.size, right.size));
  const leftFacts = exactFacts(discovered).sort();
  const rightFacts = exactFacts(verified).sort();
  const factsMatch = leftFacts.length === rightFacts.length
    && leftFacts.every((fact, index) => fact === rightFacts[index]);
  return recall >= 0.66 && factsMatch;
}

"""
replace_once(PATH, anchor, insert)

old = """    if (localOcrEvidence) {
      const evidence = localOcrEvidence.get(id) || '';
      if (!hasLocalOcrHeadlineSupport(exact.baslik, evidence)) {
        reject('aynı geniş gazete kırpımındaki yerel OCR, Vision-2 başlığını yeterince desteklemiyor');
        continue;
      }
      if (!hasLocalOcrDetailSupport(exact.aciklama, evidence)) {
        reject('aynı geniş gazete kırpımındaki yerel OCR, Vision-2 açıklamasını yeterince desteklemiyor');
        continue;
      }
    }

"""
new = """    if (localOcrEvidence) {
      const evidence = localOcrEvidence.get(id) || '';
      const headlineByOcr = hasLocalOcrHeadlineSupport(exact.baslik, evidence);
      const headlineByIndependentVision = hasVisionHeadlineConsensus(candidate.text, exact.baslik);
      if (!headlineByOcr && !headlineByIndependentVision) {
        reject('başlık ne aynı kırpım OCR kanıtıyla ne de bağımsız Vision-1/Vision-2 birebir mutabakatıyla doğrulandı');
        continue;
      }

      const detailByOcr = hasLocalOcrDetailSupport(exact.aciklama, evidence);
      const detailByIndependentVision = hasVisionDetailConsensus(candidate.detail, exact.aciklama);
      if (!detailByOcr && !detailByIndependentVision) {
        reject('açıklama ne aynı kırpım OCR kanıtıyla ne de bağımsız Vision-1/Vision-2 olgusal mutabakatıyla doğrulandı');
        continue;
      }
    }

"""
replace_once(PATH, old, new)

old_test = """  it('Vision-2 yanlış başlığı aynı kırpım OCR kanıtı desteklemiyorsa reddeder', () => {
    const result = reconcileVerifiedNewspaperText([discovered[0]], [{
      sourceHeadlineId: 'H1',
      baslik: \"FİBA'DA TUR GECESİ\",
      aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
    }], new Map([
      ['H1', \"Avrupa'da tur gecesi\\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\\nTemsilcimiz avantajlı skor arıyor.\"],
    ]));

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('başlığını yeterince desteklemiyor');
  });
"""
new_test = """  it('Vision-2 yanlış başlığı OCR ve Vision-1 birlikte desteklemiyorsa reddeder', () => {
    const result = reconcileVerifiedNewspaperText([discovered[0]], [{
      sourceHeadlineId: 'H1',
      baslik: \"FİBA'DA TUR GECESİ\",
      aciklama: 'Fenerbahçe Avrupa kupalarında tur için sahaya çıkıyor. Temsilcimiz avantajlı skor arıyor.',
    }], new Map([
      ['H1', \"Avrupa'da tur gecesi\\nFenerbahçe Avrupa kupalarında tur için sahaya çıkıyor.\\nTemsilcimiz avantajlı skor arıyor.\"],
    ]));

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('birebir mutabakatıyla');
  });
"""
replace_once(TEST, old_test, new_test)

marker = """  it('yerel OCR başlığı ve açıklamayı ayrı ayrı destekler', () => {
"""
extra = """  it('Sözcü H1 gibi iki Vision başlığı birebir aynıysa OCR metni zayıf olsa da doğru başlığı düşürmez', () => {
    const result = reconcileVerifiedNewspaperText([{
      ...discovered[0],
      text: 'İSTİKLAL MARŞI IŞIKLANAMAZ',
      detail: 'İstiklal Marşı ile ilgili aynı haberin doğrulanan açıklama metni burada yer alıyor.',
    }], [{
      sourceHeadlineId: 'H1',
      baslik: 'İSTİKLAL MARŞI IŞIKLANAMAZ',
      aciklama: 'İstiklal Marşı ile ilgili aynı haberin doğrulanan açıklama metni burada yer alıyor.',
    }], new Map([
      ['H1', 'OCR bu küçük puntoda başlığı güvenle okuyamadı'],
    ]));

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].text).toBe('İSTİKLAL MARŞI IŞIKLANAMAZ');
  });

  it('OCR açıklaması zayıfsa iki Vision aynı olgusal açıklamada birleştiğinde doğru haberi düşürmez', () => {
    const result = reconcileVerifiedNewspaperText([discovered[1]], [{
      sourceHeadlineId: 'H2',
      baslik: 'Banka takipte üretici dertli',
      aciklama: 'Üreticiler kredi faizlerini ödemekte zorlanıyor. Bankaların takibi artıyor.',
    }], new Map([
      ['H2', 'Banka takipte üretici dertli'],
    ]));

    expect(result.candidates).toHaveLength(1);
  });

  it('ne OCR ne iki Vision mutabakatı varsa açıklamayı fail-closed reddeder', () => {
    const result = reconcileVerifiedNewspaperText([discovered[0]], [{
      sourceHeadlineId: 'H1',
      baslik: \"AVRUPA'DA TUR GECESİ\",
      aciklama: 'Bambaşka bir olayda 37 kişi gözaltına alındı ve süreç başka kentte devam ediyor.',
    }], new Map([
      ['H1', \"Avrupa'da tur gecesi\"],
    ]));

    expect(result.candidates).toEqual([]);
    expect(result.rejections[0].reason).toContain('olgusal mutabakatıyla');
  });

""" + marker
replace_once(TEST, marker, extra)

print('OTONOM 3.14.56 dual-evidence consensus patch applied.')
