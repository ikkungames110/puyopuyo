#!/usr/bin/env python3
"""YouTube資料の再取得。原動画・字幕・フレームはGit管理外のresearch-localへ保存する。"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--yt-dlp', default='yt-dlp', help='yt-dlp実行ファイル、またはPython版zipのパス')
parser.add_argument('--ffmpeg', default='ffmpeg', help='フレームを抽出するffmpeg')
parser.add_argument('--discover', action='store_true', help='3テーマ各10件の候補を再検索する')
parser.add_argument('--download', action='store_true', help='採用した6動画と日本語字幕を取得する')
parser.add_argument('--frames', action='store_true', help='分析箇所の前後のフレームを抽出する')
args = parser.parse_args()
if not any([args.discover, args.download, args.frames]):
    parser.print_help()
    sys.exit(0)

out = ROOT / 'research-local'
for folder in ['videos', 'frames', 'logs']:
    (out / folder).mkdir(parents=True, exist_ok=True)
# The standalone Python release is a zip executable and can be run without chmod.
yt = [sys.executable, args.yt_dlp] if Path(args.yt_dlp).is_file() else [args.yt_dlp]
base = yt + ['--js-runtimes', 'node', '--socket-timeout', '20', '--retries', '2', '--no-progress']
manifest = json.loads((ROOT / 'src/data/research-videos.json').read_text())
if args.discover:
    for name, query in [('gtr', 'ぷよぷよ GTR 講座'), ('fold', 'ぷよぷよ 多重 折り返し 講座'), ('tail', 'ぷよぷよ 連鎖尾 講座')]:
        with (out / 'logs' / f'{name}-search.jsonl').open('w') as dest:
            subprocess.run(base + ['--flat-playlist', '--dump-json', f'ytsearch10:{query}'], stdout=dest, check=True)
        print(f'{query}：候補を保存しました。')
if args.download:
    subprocess.run(base + ['--no-playlist', '-f', 'bestvideo[height<=360][ext=mp4]/best[height<=360]',
        '--write-info-json', '--write-auto-subs', '--sub-langs', 'ja.*',
        '-o', str(out / 'videos' / '%(id)s.%(ext)s')] + [v['url'] for v in manifest], check=True)

report = []
for video in manifest:
    vid = video['id']
    if not re.fullmatch(r'[A-Za-z0-9_-]{11}', vid):
        raise ValueError('不正な動画ID')
    path = out / 'videos' / f'{vid}.mp4'
    if not path.exists():
        continue
    report.append({'id': vid, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    caption = out / 'videos' / f'{vid}.ja.vtt'
    if caption.exists():
        timestamp = ''; previous = ''; lines = []
        for line in caption.read_text().splitlines():
            if '-->' in line:
                timestamp = line.split(' -->')[0]
            elif line.strip() and not line.startswith(('WEBVTT', 'Kind:', 'Language:')):
                text = re.sub(r'<[^>]+>', '', line).strip()
                if text and text != previous:
                    lines.append(f'{timestamp} {text}'); previous = text
        (out / 'videos' / f'{vid}.transcript.txt').write_text('\n'.join(lines))
    if args.frames:
        for segment in video['segments']:
            for offset in [-2, 0, 2]:
                second = max(0, segment['seconds'] + offset)
                subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-ss', str(second), '-i', str(path),
                    '-frames:v', '1', '-y', str(out / 'frames' / f'{vid}-{second}.png')], check=True)
        print(f'{video["title"]}：字幕と分析箇所のフレームを保存しました。')
(out / 'logs' / 'download-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('完了。自動字幕の用語や盤面の色はフレームと照合してください。採用する要約はsrc/data/research-videos.jsonで管理します。')
