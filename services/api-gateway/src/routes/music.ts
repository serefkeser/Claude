import { Hono } from 'hono';

const DRIVE_FOLDER_ID = '19bbiNUvhdq5FyCdPYDsfVEN7RpFajJMY';

// Verified from the user's shared Google Drive folder on 2026-08-26.
// The web app selects one of these tracks automatically for background music.
const NEWS_MUSIC = [
  ['1d_c5PKircSIHPMUyl5SxbthkZno72wx4', 'paradasi.mp3'],
  ['1TJZhl-R4Scm67bUAKWkw2POttXt70HLG', 'saclarin sokup atılmıyor.mp3'],
  ['17iNCbWl02z3TUVe4Hc4541utljKvbG6l', 'saclarin.mp3'],
  ['11-9JO_OcMfYlOhGist_YErQtzCryBmCX', 'shape of my hearth.mp3'],
  ['1MxoId4bqAvr_guE7ONLF3RUB4CstBJlB', 'kurtlar vadisi.mp3'],
  ['1yc0UvrvqFePoVIX2OEY_kT2Ot6C1bWY1', 'whisper.mp3'],
  ['1RWyqmMFNQmG26GMJcBle9w44ZaUPfnjg', 'amerika katil.mp3'],
  ['1HaskzT7MzzIQFVD8HaJF_cuJ0TC4fo92', 'polyushka.mp3'],
  ['1WY6H8JPzzyQMS3bDtDeokbwj0P5DcPG9', 'pukku tepe.mp3'],
  ['1tE4YO8sisZzMyrzPEOlkO1Q4dtXoM53u', 'insan insan.mp3'],
  ['1Hn8esvKoG7wtUIBJwANjRN2XI2fzNFQ7', 'dediler yar uyumus.mp3'],
  ['1BM75xVizIrFRYzVQ1nDYg4mmJ81TSPzv', 'gel mabel matiz.mp3'],
  ['1cWwjBn50AM7cwcVpQJrLpwD3_UJS_hcd', 'muhur gozlum.mp3'],
  ['1SGjAiD-SE3VR_Bv3cz0fNs6TK5jRKBlq', 'olunce sevemezsem seni.mp3'],
  ['1n5dpyHBZJNKAJuMBrCoGcaAjSYNdOOzQ', 'donence.mp3'],
  ['1nomMVKu4LPzX78sOShr1qwHPiAE4OYZw', 'aldirma gonul.mp3'],
  ['1gNYJjS1crL7K-H5ZNl2k0p36X_69KzpB', 'karanfil kokuyor.mp3'],
  ['1mxtgg5FxUSblz_RZ3f0urfygSnh959qA', 'mazeretim var.mp3'],
  ['1fUfehfqhja03ihlShyaKJbHnrshCNkny', 'vurgunum.mp3'],
  ['1p-3e83ceJ-535mJ92PyShRTuyh3sg0i-', 'the sound of silence.mp3'],
  ['1jUqMnJTq4L8DOax_sYGOQnr4etVzbOVV', 'hasret.mp3'],
  ['1d_dXg_U0DoMGWxUiLlRH_r06xHtF7LOb', 'First_Light_On_The_Square.mp3'],
  ['1iI5-IEr7rrr9-BqDeCvfQE3XZCW-rc2C', 'selvi boylum.mp3'],
  ['1fwfPFLmBeU8AGjfeKISgy4rh-ZMMgZsA', 'susamam adalet.mp3'],
  ['1mtWZa0pnqQBo80gcFEu5woQaraqlUXNS', 'yazıklar olsun.mp3'],
  ['1Zkk4G9vtKrlnI6AEWtHOunvJ-SHU41q6', 'bıraktım geldim.mp3'],
  ['1r8sDnPYPfpLJDIoDoEo3qjCvZNONpAso', 'michael tüm şarkıları .mp3'],
  ['1IsR5qfLHOr32iX0wVonkmU8Ym3VsRRCq', 'billie jean michael.mp3'],
  ['1_23whdWNFUhXrA-y1byyAE5ZMAjsqRzL', 'care about us michael.mp3'],
  ['1p1_SKQngccb-iqkO9uGMZo9N-jd_3PgM', 'forever young.mp3'],
  ['1ZuGnIhwLYGAaxEl9BQbwABcSBRbmj6Du', 'big in japan.mp3'],
  ['1qP1lZV32CYBGoeDSWcVZhkSpe9q-1A-Z', 'Ufo361 ve Capital Bra.mp3'],
  ['1nyjOin9JNuvNz2HxIxTUYcPJRhDS8mp7', 'Baller Los.mp3'],
  ['1NeVgGR5gRSG6DFRKL2q8TJa_M5mmb8rY', 'Lili Marleen.mp3'],
  ['1MbppjbWZbE0RFvJQ8xmrpTsXWzepF4ll', 'Atemlos durch die Nacht.mp3'],
  ['1bCcAxIYDFfr-D7oxAUlqrJeZ6B68BsU8', 'Udo Lindenberg  Apache 207.mp3'],
  ['1ZioZnaungm_pcBy-pECG2-p4d0qSz9Ao', 'Major Tom.mp3'],
  ['1iiPFecF2zO6WzPmDoyY6oZ7WUaC6YaZP', 'Autobahn.mp3'],
  ['1ZO2Uo-u-eR4QgQ_kKmxM5n2P1P89rjdA', 'Nena 99 Luftballons.mp3'],
  ['1MdGTt1F_j7hlhiiM0m-wLnDa8RapeAio', 'Scorpions  Wind of Change.mp3'],
  ['1dHhc9AJwzj6xEEqrhP4_a546JUNMLMuA', 'Rammstein - Du Hast.mp3'],
  ['1i8OwWOuALU4LEQAQrmBZtuAWL_LNFqVc', 'haram saltanatı.mp3'],
  ['1gqOKsaexcbAUI2O_xJUnvqciR4w6h8-o', 'kabede hacılar hu der Allah.mp3'],
  ['1VvLjrR5LyVNcdohB6EsxeOvMaP6_qEoG', 'yiyin efendiler.mp3'],
  ['18YQEgG1nz-ghMHi4rkcM6mhVpISdXykN', 'susamam her yer üniversite.mp3'],
  ['1-UJYec3EoRsOOOitcTI_RB1APabR-WrV', 'yuru bre hızır pasa.mp3'],
  ['1i8FiE5uktXhftqHqwcsktSybhoLG5ROB', 'son mohikan.mp3'],
  ['1Z4uUkEPaSQXRQtzWGHjEJBcfeJLIHcev', 'ben yoruldum hayat.mp3'],
  ['1f5jNRJ75Iml2B9y-DPqh0k_jbtRByNkt', 'bu can senin.mp3'],
  ['1HjyIa6o_IJvbCIEydYpltoxVZSYvrG7T', 'sifa istemem.mp3'],
  ['1bZGjrdVqSxpqnoPb8WVB4gRIREsneFHo', 'piro derdi varsa aglar insan.mp3'],
  ['1TEo_76LTIijPWXAPdVYfQMPJbSSrbL-C', 'isvecli filistin sarkısı.mp3'],
  ['1vM9hGJdbc5avBAl_BuYZ4dmQpy526_q-', 'yasar kurt anne.mp3'],
  ['1uQEo7z0ANES6PICdVLVksqHaEbPQNMjA', 'hakim bey.mp3'],
  ['1hmIjjyu9x5PQ6uYpxeRQCJVdfe1qxwGf', 'cav bella.mp3'],
  ['1kI-W_TD2_UHASS2HfPdU1rqkAPCu8HQU', 'izmir marsi.mp3'],
  ['1wysICpNqInsxzJCKIQtqtfwOf4FZh6Cz', 'sen benimsin.mp3'],
  ['1M5xLlDETPDrVfyuNxgDTV9DxyutDRGPc', 'sen gel diyorsun.mp3'],
  ['1JNB8K8xOFOLohrfJnw_h-IYfpKO7loK9', 'gururla bakıyorum dunyaya.mp3'],
  ['1c6hh3CqpdtW_VeShYGeQTGHJ3Mrp2rQR', 'nereden bileceksiniz.mp3'],
  ['1te-5TXD8YLKu9Fy1PneG4N2FcvrmSba8', 'tuna nehri sesli.mp3'],
  ['142A0miZf9jnDoYZGXRBOOQ-91B8qP9yi', 'merdo.mp3'],
  ['16Mr9YprPx9f-5OkjgcvWGBsAyaKRTbcf', 'bugünvatan haini dedikleriniz.mp3'],
  ['1295rxo__qU-tYMVMt8_XVUTdc5SSzlJ2', 'devrim müziği.mp3'],
  ['1U3eDdj1IX08Xvr3iXUHaJ1GAXv2dLjeZ', 'agladım anne.mp3'],
  ['1IsWZ6D0rSZ_MbPHlbMBz5eVGWJCzuxar', 'nesdin dede.mp3'],
  ['1I1fhxSsu-I4-nGQxGYpBPxOsFEnAgHQR', 'guzel gunler gorecegiz.mp3'],
  ['1YjDPcZjtL_XzLAuvbpU6D3dVXtpwbMo3', 'adaletin bu mu dünya.mp3'],
  ['1Eef5QdVeB0_65FSBHRb_UqshIYMrqnRK', 'hatiranyeter.mp3'],
  ['1GhAEBFIqfAdn5wvlvFn7kA_sH8DgK5vJ', 'birbaskadirbenim memleketim.mp3'],
  ['1j5JDQYf1F3cvG4eGH9wPeyQt5jjp8vUT', 'ararbuluruz.mp3'],
  ['1NEyiltOEriiJ0-L7fWyGGMKeEx7Uug_W', 'lucenzo.mp3'],
  ['1WS4uddqGh_bgU0JORILLqAhFP1G51WQ6', 'chery chery lady.mp3'],
  ['1tw3uD1h-DOf5xaprOENjSuc6_dAJV60L', 'gonul dagi nesat ertas.mp3'],
  ['1jky6OuHXMWu2F4Q9m4x-ZwqinPZwe5ab', 'organize işler bunlar.mp3'],
  ['1ainSdMPt-0tQknlylAaiqpABz7dx9GHZ', 'by by lorenz.mp3'],
  ['1sflC5yLwHyAHU74WknMuGMotZCwPY5k8', 'bob marleyin sozu.mp3'],
  ['18Amhe5n0FmXq7BRkKzRFRBeHmMjj0pMC', 'yılmaz erdogandan nasihat.mp3'],
  ['1DEneONOpeGUke8ewdoUIID8415LiGiDR', 'gencligime sevgilerimle.mp3'],
  ['1q9Ln7KtwtINa8eZsLt7SeqnnSzmEjZ4G', 'sensizlik.mp3'],
  ['18OZPl-9konGMp_XIMXazhovhHWLE2oZF', 'parla.mp3'],
  ['1sj_UsiSAI07J2AmYy6vz1FPZSdRJ4T_X', 'ölürem türkiyem.mp3'],
  ['178e3S918fQNNWK8GhbPlKdEMORHeM_k2', 'isyan ateş.mp3'],
  ['14sybc2FqjHXNyNoycAtpjf-z3j9lh8Ai', 'papaoutai.mp3'],
  ['1qcaBtBtmaTLhvuVvFmo40Kqm3zEggqXF', 'benim babam fatih kısaparmak.mp3'],
  ['1xgUL7oYhZc0iF75Ndr3zWRgpvpdTcYEL', 'volkan konak aysem.mp3'],
  ['1BoctFr42Fmcgbn0DGKmwrx-pt-gNAnGS', 'volkan konak vatan haini2.mp3'],
  ['1u95LYFO02C2YUX2MnWc9LY-QL9UpoVfc', 'volkan konak vatan haini.mp3'],
  ['1NUgqdRpnSy45zv7VwaDBlmX1DXCrw7RJ', 'bir daha gel samsundan.mp3'],
  ['1VL8qmkM6bna5wK9-H1aI2dcAwUJmfKN0', 'the wall pink floyd.mp3'],
  ['1G5HE56FbngBHcLskrSULyjemMYHJMTZD', 'boniem rasputin.mp3'],
  ['1YX5i-jaxkKE69F6v9E7PrFuinckXrK6v', 'boniem deri ku.mp3'],
  ['14bwWlvzYhxzw8wEqQ5HlZcrt1XoU0Ues', 'ugurlar olsun.mp3'],
  ['1hgf_PUS7XNMSexye5ga-YAc5tW1Gs84O', 'minnet eylemem.mp3'],
  ['10ufh3xc_3Z417o_hYVt9CWcCjPwr_H9F', 'don gel bir tanem.mp3'],
  ['1anXtVUR6pVVppTIzRfTz7k5b7UMK0N2p', 'oyle bir yerdeyim ki.mp3'],
  ['15lCi17iOEvvKjLt27hjk9f4xHy_usmjD', 'surgun.mp3'],
  ['1eUQsN4fagvtAqruZDycPESn7k55Px1Mc', 'daglarımı yazdın.mp3'],
  ['1D9LfjZRrevlGlek0WWKeUOBpm9XZvH1d', 'inci tanleri 1.16.mp3'],
  ['11b5bdDOlvgsOkFkagj2cx_hDtH07mhPV', 'deha uzun.mp3'],
] as const;

export const musicRoutes = new Hono();

musicRoutes.get('/catalog', c => c.json({
  success: true,
  data: {
    folderId: DRIVE_FOLDER_ID,
    trackCount: NEWS_MUSIC.length,
    tracks: NEWS_MUSIC.map(([id, name]) => ({
      id,
      name,
      mimeType: 'audio/mpeg',
      url: `${new URL(c.req.url).origin}/music/${id}`,
    })),
  },
}));

musicRoutes.get('/:id', async c => {
  const id = c.req.param('id');
  const track = NEWS_MUSIC.find(([trackId]) => trackId === id);
  if (!track) return c.json({ success: false, error: { code: 'MUSIC_NOT_FOUND', message: 'Müzik bulunamadı.' } }, 404);

  const source = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`, {
    redirect: 'follow',
  });
  if (!source.ok || !source.body) {
    return c.json({
      success: false,
      error: { code: 'DRIVE_MUSIC_FETCH_FAILED', message: `Google Drive müziği alınamadı (HTTP ${source.status}).` },
    }, 502);
  }

  return new Response(source.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `inline; filename="${track[1].replace(/["\\]/g, '_')}"`,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

export { DRIVE_FOLDER_ID, NEWS_MUSIC };
