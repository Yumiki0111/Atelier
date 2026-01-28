#!/usr/bin/env node

/**
 * 一括ショップ作成スクリプト
 * 
 * 使い方:
 *   node scripts/bulk-provision-shops.js shops.csv
 * 
 * CSV フォーマット:
 *   shopName,ownerEmail,allowedDomains
 *   株式会社A,owner-a@example.com,"example-a.com,www.example-a.com"
 *   株式会社B,owner-b@example.com,"example-b.com"
 */

const fs = require('fs');
const readline = require('readline');

// 環境変数のチェック
const ATELIER_ADMIN_TOKEN = process.env.ATELIER_ADMIN_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!ATELIER_ADMIN_TOKEN) {
  console.error('❌ エラー: ATELIER_ADMIN_TOKEN 環境変数が設定されていません');
  console.error('');
  console.error('使い方:');
  console.error('  ATELIER_ADMIN_TOKEN=your-token node scripts/bulk-provision-shops.js shops.csv');
  process.exit(1);
}

// コマンドライン引数のチェック
const csvFile = process.argv[2];
if (!csvFile) {
  console.error('❌ エラー: CSV ファイルを指定してください');
  console.error('');
  console.error('使い方:');
  console.error('  node scripts/bulk-provision-shops.js shops.csv');
  process.exit(1);
}

if (!fs.existsSync(csvFile)) {
  console.error(`❌ エラー: ファイルが見つかりません: ${csvFile}`);
  process.exit(1);
}

// CSV パース関数
function parseCSVLine(line) {
  const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
  return line.split(regex).map(field => 
    field.trim().replace(/^"|"$/g, '')
  );
}

// ショップ作成関数
async function provisionShop(shopName, ownerEmail, allowedDomains) {
  const domainsArray = allowedDomains.split(',').map(d => d.trim()).filter(d => d.length > 0);
  
  try {
    const response = await fetch(`${API_URL}/api/internal/provision-shop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-atelier-admin-token': ATELIER_ADMIN_TOKEN,
      },
      body: JSON.stringify({
        shopName,
        ownerEmail,
        allowedDomains: domainsArray,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'ショップの作成に失敗しました');
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// メイン処理
async function main() {
  console.log('🚀 一括ショップ作成を開始します...');
  console.log('');

  const fileStream = fs.createReadStream(csvFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let successCount = 0;
  let errorCount = 0;
  const results = [];

  for await (const line of rl) {
    lineNumber++;
    
    // ヘッダー行をスキップ
    if (lineNumber === 1) {
      continue;
    }

    // 空行をスキップ
    if (!line.trim()) {
      continue;
    }

    const [shopName, ownerEmail, allowedDomains] = parseCSVLine(line);

    if (!shopName || !ownerEmail) {
      console.log(`⚠️  行 ${lineNumber}: スキップ（shopName または ownerEmail が空）`);
      errorCount++;
      continue;
    }

    console.log(`📦 [${lineNumber - 1}] ${shopName} (${ownerEmail}) を作成中...`);

    const result = await provisionShop(shopName, ownerEmail, allowedDomains || '');

    if (result.success) {
      console.log(`✅ [${lineNumber - 1}] ${shopName} を作成しました`);
      console.log(`   Shop ID: ${result.data.shop_id}`);
      console.log(`   Public Key: ${result.data.public_key}`);
      console.log(`   Secret Key: ${result.data.secret_key.substring(0, 20)}...`);
      console.log('');
      successCount++;
      
      results.push({
        shopName,
        ownerEmail,
        ...result.data,
      });
    } else {
      console.log(`❌ [${lineNumber - 1}] ${shopName} の作成に失敗: ${result.error}`);
      console.log('');
      errorCount++;
    }

    // レート制限対策: 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 結果をファイルに出力
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultFile = `provision-results-${timestamp}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));

  console.log('');
  console.log('========================================');
  console.log('🎉 一括作成が完了しました');
  console.log('========================================');
  console.log(`✅ 成功: ${successCount} 件`);
  console.log(`❌ 失敗: ${errorCount} 件`);
  console.log(`📄 結果: ${resultFile}`);
  console.log('');
  console.log('⚠️  注意: Secret Key は結果ファイルに保存されています。');
  console.log('   安全に管理し、不要になったら削除してください。');
}

main().catch(error => {
  console.error('❌ エラー:', error);
  process.exit(1);
});
