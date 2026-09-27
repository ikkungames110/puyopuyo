// Fetch unmodified teaching-material images for this local learning workspace.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const provenance = JSON.parse(
  await readFile(new URL('./asset-provenance.json', import.meta.url), 'utf8'),
);
const directory = new URL('../public/official/', import.meta.url);
await mkdir(directory, { recursive: true });
for (const [name, hash] of Object.entries(provenance.files)) {
  const relative = name.endsWith('.png') ? `img/${name}` : name;
  const response = await fetch(
    `https://raw.githubusercontent.com/sity-games/sega-puyo/${provenance.commit}/${relative}`,
  );
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(buffer).digest('hex') !== hash)
    throw new Error(`${name}: 素材のハッシュが一致しません。`);
  await writeFile(new URL(name, directory), buffer);
}
await writeFile(new URL('manifest.json', directory), JSON.stringify(provenance.manifest, null, 2));
console.log('公式教材由来の画像6枚と付属利用許諾書を public/official/ に配置しました。©SEGA');
console.log('公式配布元: ' + provenance.upstream);
console.log('取得元: ' + provenance.mirror + '/tree/' + provenance.commit);
console.log(
  'このフォルダはGit管理対象外です。利用条件は public/official/SEGA_License.txt を確認してください。',
);
