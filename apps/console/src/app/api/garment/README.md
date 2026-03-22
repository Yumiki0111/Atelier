# 写真 → 背景除去 API（商品切り抜き）

## 概要

`POST /api/garment/remove-background` は、アップロードした写真から背景を除去し、切り抜き済み PNG を返します。  
フロントではその画像を輪郭トレースして SVG 化し、モデルに着用します。

## セットアップ（Python rembg）

API を有効にするには、実行環境に **Python 3** と **rembg** をインストールしてください。

```bash
# pip が無い場合は python3 -m pip を使う
python3 -m pip install "rembg[cpu,cli]"

# または（pip / pip3 が PATH にある場合）
pip install "rembg[cpu,cli]"
# pip3 install "rembg[cpu,cli]"

# GPU 対応（CUDA など）
python3 -m pip install "rembg[gpu,cli]"
```

API は `python3 -c "from rembg import remove; ..."` のように rembg を**ライブラリとして**呼び出します（`python3 -m rembg` の CLI は使いません）。

- Windows の場合は `py` を試します。
- rembg 未インストール時は API は **501** を返し、クライアントは角の色による簡易前景推定＋輪郭トレースにフォールバックします（四角に近い形になります）。
