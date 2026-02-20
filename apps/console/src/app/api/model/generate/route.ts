import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/middleware";
import { getMeshcapadeHeaders } from "@/lib/meshcapade/token-manager";

/**
 * 測定値から3Dモデルを生成するAPIエンドポイント
 * 
 * MeshcapadeのOAuth2トークンを自動取得してAPIを呼び出します。
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { measurements } = body;

    if (!measurements) {
      return NextResponse.json(
        { error: "Measurements are required" },
        { status: 400 }
      );
    }

    // Meshcapadeトークンを自動取得（OAuth2）
    const headers = await getMeshcapadeHeaders();

    // Meshcapade Me APIのベースURL
    // 環境変数が設定されている場合はそれを使用、なければデフォルト値
    // 注意: 環境変数にはベースURLのみを設定（例: https://api.meshcapade.com/api/v1）
    let baseUrl = process.env.MESHCAPADE_API_URL || "https://api.meshcapade.com/api/v1";
    
    // 環境変数が古い形式（/v1/models/generateなど）の場合は修正
    if (baseUrl.includes("/models/generate") || baseUrl.includes("/v1/models")) {
      console.warn("[Model Generation] MESHCAPADE_API_URL seems to be set to old format, using default");
      baseUrl = "https://api.meshcapade.com/api/v1";
    }
    
    console.log("[Model Generation] Step 1: Creating avatar from measurements");
    console.log("[Model Generation] Base URL:", baseUrl);
    console.log("[Model Generation] Raw measurements input:", JSON.stringify(measurements, null, 2));
    
    // 測定値の詳細をログ出力（単位確認用）
    console.log("[Model Generation] Measurements breakdown:", {
      height: `${measurements.height}cm`,
      chest: `${measurements.chest}cm`,
      waist: `${measurements.waist}cm`,
      hip: `${measurements.hip}cm`,
      shoulder: measurements.shoulder ? `${measurements.shoulder}cm` : "not provided",
      armLength: measurements.armLength ? `${measurements.armLength}cm` : "not provided",
      legLength: measurements.legLength ? `${measurements.legLength}cm` : "not provided",
      neck: measurements.neck ? `${measurements.neck}cm` : "not provided",
      sleeve: measurements.sleeve ? `${measurements.sleeve}cm` : "not provided",
      inseam: measurements.inseam ? `${measurements.inseam}cm` : "not provided",
    });

    // Step 1: 測定値からアバター作成
    // Postmanの「Create Avatars from measurements」の形式に合わせる
    // JSON:API形式の可能性があるので、両方の形式を試せるようにする
    // まずはシンプルな形式を試す
    const measurementsData = {
      height: measurements.height,
      chest: measurements.chest,
      waist: measurements.waist,
      hip: measurements.hip,
      // オプション項目も含める
      ...(measurements.shoulder && { shoulder: measurements.shoulder }),
      ...(measurements.armLength && { armLength: measurements.armLength }),
      ...(measurements.legLength && { legLength: measurements.legLength }),
      ...(measurements.neck && { neck: measurements.neck }),
      ...(measurements.sleeve && { sleeve: measurements.sleeve }),
      ...(measurements.inseam && { inseam: measurements.inseam }),
    };
    
    // JSON:API形式を試す（Postmanの形式に合わせる）
    const createRequestBody: any = {
      data: {
        type: "avatars",
        attributes: {
          measurements: measurementsData,
        },
      },
    };
    
    // 肌色パラメータを追加（複数のパラメータ名を試す）
    if (measurements.skinTone !== undefined) {
      // 一般的なパラメータ名を試す
      // Meshcapade APIがサポートしているパラメータ名に応じて調整が必要
      createRequestBody.data.attributes.skinTone = measurements.skinTone;
      // 他の可能性のあるパラメータ名（コメントアウト）
      // createRequestBody.data.attributes.skinColor = measurements.skinTone;
      // createRequestBody.data.attributes.skin_color = measurements.skinTone;
      // createRequestBody.data.attributes.appearance = { skinTone: measurements.skinTone };
      
      console.log("[Model Generation] Skin tone parameter added:", measurements.skinTone);
    }
    
    console.log("[Model Generation] Request URL:", `${baseUrl}/avatars/create/from-measurements`);
    console.log("[Model Generation] Request body:", JSON.stringify(createRequestBody, null, 2));
    console.log("[Model Generation] Measurements data being sent:", JSON.stringify(measurementsData, null, 2));
    console.log("[Model Generation] Headers:", Object.fromEntries(headers.entries()));
    
    const createResponse = await fetch(`${baseUrl}/avatars/create/from-measurements`, {
      method: "POST",
      headers,
      body: JSON.stringify(createRequestBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[Model Generation] Step 1 failed:", createResponse.status, errorText);
      
      // 401エラーの場合はトークンの問題を明確に示す
      if (createResponse.status === 401) {
        return NextResponse.json(
          { 
            error: "Meshcapade API authentication failed",
            details: errorText,
            hint: "The token may be expired or invalid. Please update MESHCAPADE_TOKEN in .env.local",
            step: 1,
            status: createResponse.status
          },
          { status: createResponse.status }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create avatar from measurements", 
          details: errorText,
          step: 1,
          status: createResponse.status
        },
        { status: createResponse.status }
      );
    }

    const createResult = await createResponse.json();
    
    // レスポンス全体をログ出力（測定値が反映されているか確認）
    console.log("[Model Generation] ========================================");
    console.log("[Model Generation] Avatar creation response (FULL):");
    console.log(JSON.stringify(createResult, null, 2));
    console.log("[Model Generation] ========================================");
    
    // 測定値がレスポンスに含まれているか確認
    const responseMeasurements = 
      createResult?.data?.attributes?.measurements ||
      createResult?.data?.measurements ||
      createResult?.measurements;
    
    // shapeパラメータも確認（アバター作成時のレスポンスに含まれる可能性がある）
    const shapeParams = 
      createResult?.data?.attributes?.shapeParameters ||
      createResult?.data?.attributes?.shape_parameters ||
      createResult?.data?.attributes?.shape ||
      createResult?.data?.shapeParameters ||
      createResult?.data?.shape ||
      createResult?.shapeParameters ||
      createResult?.shape;
    
    console.log("[Model Generation] Shape parameters in avatar creation response:", shapeParams);
    
    // アバター作成時のレスポンスにshapeパラメータが含まれていない場合の警告
    if (!shapeParams || (typeof shapeParams === 'string' && JSON.parse(shapeParams).every((v: number) => Math.abs(v) < 0.001))) {
      console.warn("[Model Generation] ⚠ Shape parameters not found or all zeros in avatar creation response");
      console.warn("[Model Generation] This suggests measurements may not be converted to shape parameters");
      console.warn("[Model Generation] Check if the API endpoint expects different parameters or format");
    }
    
    if (responseMeasurements) {
      console.log("[Model Generation] Measurements in response:", JSON.stringify(responseMeasurements, null, 2));
      
      // 測定値の比較と検証
      const comparison: Record<string, { sent: number | undefined; received: number | undefined; match: boolean }> = {};
      let allMatch = true;
      
      Object.keys(measurementsData).forEach((key) => {
        const sent = measurementsData[key as keyof typeof measurementsData];
        const received = responseMeasurements[key];
        const match = sent !== undefined && received !== undefined && Math.abs(sent - received) < 0.1;
        comparison[key] = { sent, received, match };
        if (!match && sent !== undefined) {
          allMatch = false;
          console.warn(`[Model Generation] Measurement mismatch for ${key}: sent=${sent}, received=${received}`);
        }
      });
      
      console.log("[Model Generation] Measurement comparison:", JSON.stringify(comparison, null, 2));
      
      if (allMatch) {
        console.log("[Model Generation] ✓ All measurements match between sent and received");
      } else {
        console.warn("[Model Generation] ⚠ Some measurements do not match - model may not reflect input values");
      }
    } else {
      console.warn("[Model Generation] No measurements found in response - API may not return measurements");
      console.warn("[Model Generation] ⚠ Cannot verify if measurements were applied correctly");
    }
    
    // shapeパラメータがすべて0の場合は警告
    if (shapeParams) {
      const shapeArray = typeof shapeParams === 'string' ? JSON.parse(shapeParams) : shapeParams;
      const allZeros = Array.isArray(shapeArray) && shapeArray.every((v: number) => Math.abs(v) < 0.001);
      if (allZeros) {
        console.warn("[Model Generation] ⚠ Shape parameters are all zeros - measurements may not be applied to the model");
        console.warn("[Model Generation] This could indicate that:");
        console.warn("[Model Generation] 1. Measurements were not converted to shape parameters");
        console.warn("[Model Generation] 2. The API endpoint may require different parameters");
        console.warn("[Model Generation] 3. The measurements format may be incorrect");
      } else {
        console.log("[Model Generation] ✓ Shape parameters are non-zero - measurements appear to be applied");
      }
    }
    
    // JSON:API形式の可能性があるので、data.id または id を確認
    const avatarId = createResult?.data?.id || createResult?.id || createResult?.avatarId;
    
    if (!avatarId) {
      console.error("[Model Generation] No avatarId in response:", createResult);
      return NextResponse.json(
        { 
          error: "Avatar creation succeeded but no avatarId returned",
          details: JSON.stringify(createResult)
        },
        { status: 500 }
      );
    }

    console.log("[Model Generation] Step 1 success, avatarId:", avatarId);
    console.log("[Model Generation] Step 2: Exporting avatar (FBX format)");

    // Step 2: Export job (非同期) → READYまでポーリング
    // 注意: Meshcapade APIのエクスポートパラメータを確認
    // pose: "i" = Iポーズ、"a" = Aポーズ、"t" = Tポーズ
    // handPose や hand_pose などのパラメータがあるかどうかはAPIドキュメントを確認
    const exportBody: Record<string, any> = {
      pose: "i",          // "i" = Iポーズ、"a" = Aポーズ、"t" = Tポーズ
      format: "fbx",      // "fbx" or "obj" 推奨
    };
    
    // 手のポーズを制御できるパラメータがあるか試す
    // 一般的なパラメータ名: handPose, hand_pose, handPoseType, handState, handStateType
    // 値の例: "relaxed", "slightly_closed", "closed", "open", "fist", "grip" など
    // 注意: これらは推測であり、実際のAPIドキュメントで確認が必要
    // 試しにいくつかのパラメータ名を試す（エラーが出る場合は無視される）
    const handPoseParams = [
      { handPose: "slightly_closed" },
      { hand_pose: "slightly_closed" },
      { handState: "relaxed" },
      { hand_state: "relaxed" },
    ];
    
    // 最初のパラメータを試す（他のパラメータ名も試したい場合は順番に変更）
    // 注意: APIがサポートしていないパラメータは無視される可能性が高い
    Object.assign(exportBody, handPoseParams[0]);
    
    console.log("[Model Generation] Export body parameters:", JSON.stringify(exportBody, null, 2));
    console.log("[Model Generation] Note: If hand pose doesn't work, try other parameter names:", handPoseParams.map(p => Object.keys(p)[0]));

    // ポーリング間隔を動的に調整：最初は500ms、5回目以降は1500ms
    const initialPollIntervalMs = 500;
    const normalPollIntervalMs = 1500;
    const pollTimeoutMs = 60_000;
    const deadline = Date.now() + pollTimeoutMs;
    let pollCount = 0;

    // 最初の1回だけexportエンドポイントにPOSTを送る
    console.log("[Model Generation] Step 2: Initiating export job");
    console.log("[Model Generation] Export settings:", {
      pose: exportBody.pose,
      format: exportBody.format,
      note: "pose 'a' = A-pose (I-pose), 't' = T-pose",
    });
    const exportResponse = await fetch(`${baseUrl}/avatars/${avatarId}/export`, {
      method: "POST",
      headers,
      body: JSON.stringify(exportBody),
    });

    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.error("[Model Generation] Step 2 failed:", exportResponse.status, errorText);
      return NextResponse.json(
        { 
          error: "Failed to export avatar", 
          details: errorText, 
          step: 2, 
          avatarId 
        },
        { status: exportResponse.status }
      );
    }

    const initialExportResult = await exportResponse.json();
    console.log("[Model Generation] Export job initiated:", JSON.stringify(initialExportResult, null, 2));
    
    // meshSelfLinkを取得（最初のレスポンスから）
    const meshSelfLink = 
      initialExportResult?.data?.links?.self || 
      initialExportResult?.links?.self;
    
    if (!meshSelfLink) {
      console.error("[Model Generation] No mesh self link found in export response");
      return NextResponse.json(
        { 
          error: "Export initiated but no mesh link found", 
          step: 2, 
          avatarId,
          exportResult: initialExportResult
        },
        { status: 500 }
      );
    }

    console.log("[Model Generation] Polling mesh status from:", meshSelfLink);

    // その後はmeshSelfLinkをGETしてステータスを確認
    let isFirstLoop = true;
    let exportResult: any = initialExportResult;

    while (Date.now() < deadline) {
      // 2回目以降はGETでステータスを確認
      if (!isFirstLoop) {
        const meshResponse = await fetch(meshSelfLink, {
          method: "GET",
          headers,
        });

        if (!meshResponse.ok) {
          const errorText = await meshResponse.text();
          console.error("[Model Generation] Failed to fetch mesh status:", meshResponse.status, errorText);
          return NextResponse.json(
            { 
              error: "Failed to fetch mesh status", 
              details: errorText, 
              step: 2, 
              avatarId 
            },
            { status: meshResponse.status }
          );
        }

        exportResult = await meshResponse.json();
      }
      
      isFirstLoop = false;
      console.log("[Model Generation] Export status check:", JSON.stringify(exportResult, null, 2));

      // エクスポート時のshapeパラメータを確認
      const exportShapeParams = 
        exportResult?.data?.attributes?.metadata?.parameters?.shapeParameters ||
        exportResult?.data?.attributes?.shapeParameters ||
        exportResult?.data?.shapeParameters ||
        exportResult?.shapeParameters;
      
      if (exportShapeParams) {
        console.log("[Model Generation] Shape parameters in export metadata:", exportShapeParams);
        const shapeArray = typeof exportShapeParams === 'string' ? JSON.parse(exportShapeParams) : exportShapeParams;
        const allZeros = Array.isArray(shapeArray) && shapeArray.every((v: number) => Math.abs(v) < 0.001);
        if (allZeros) {
          console.warn("[Model Generation] ⚠ WARNING: Export shape parameters are all zeros!");
          console.warn("[Model Generation] The generated model may not reflect the input measurements.");
        } else {
          console.log("[Model Generation] ✓ Export shape parameters are non-zero");
        }
      }

      // JSON:API形式で、stateをチェック（statusではなくstate）
      const state =
        exportResult?.data?.attributes?.state ||
        exportResult?.data?.state ||
        exportResult?.state ||
        exportResult?.data?.attributes?.status ||
        exportResult?.data?.status ||
        exportResult?.status;

      // urlの構造を確認（attributes.urlがオブジェクトの可能性がある）
      const urlObj = 
        exportResult?.data?.attributes?.url ||
        exportResult?.data?.url ||
        exportResult?.url;
      
      // urlがオブジェクトの場合は、その中のpathプロパティを取得
      let url: string | undefined;
      if (typeof urlObj === 'string') {
        url = urlObj;
      } else if (urlObj) {
        // url.pathが空でない場合はそれを使用
        url = urlObj.path && urlObj.path.trim() !== '' 
          ? urlObj.path 
          : urlObj.url || urlObj.downloadUrl || urlObj.href;
      }

      console.log("[Model Generation] State:", state, "URL:", url, "URL object:", JSON.stringify(urlObj));

      // READYまたは完了状態をチェック
      if (state === "READY" || state === "COMPLETE" || state === "COMPLETED") {
        // url.pathが空の場合は、links.selfのエンドポイントをGETして詳細を取得
        if (!url || url.trim() === '') {
          const meshSelfLink = exportResult?.data?.links?.self || exportResult?.links?.self;
          if (meshSelfLink) {
            console.log("[Model Generation] URL not found in export response, fetching mesh details from:", meshSelfLink);
            const meshResponse = await fetch(meshSelfLink, {
              method: "GET",
              headers,
            });
            
            if (meshResponse.ok) {
              const meshData = await meshResponse.json();
              const meshUrlObj = 
                meshData?.data?.attributes?.url ||
                meshData?.data?.url ||
                meshData?.url;
              
              if (meshUrlObj) {
                url = typeof meshUrlObj === 'string' 
                  ? meshUrlObj 
                  : (meshUrlObj.path && meshUrlObj.path.trim() !== '' 
                      ? meshUrlObj.path 
                      : meshUrlObj.url || meshUrlObj.downloadUrl || meshUrlObj.href);
                console.log("[Model Generation] Fetched URL from mesh details:", url);
              }
            }
          }
        }
        
        if (url && url.trim() !== '') {
          // urlが相対パスの場合は、ベースURLと組み合わせる
          const finalUrl = url.startsWith('http') ? url : `${baseUrl.replace('/api/v1', '')}${url}`;
          console.log("[Model Generation] Step 2 success, model ready:", finalUrl);
          return NextResponse.json({
            avatarId,
            modelId: avatarId,
            exportStatus: state,
            modelUrl: finalUrl,
            format: exportBody.format,
            pose: exportBody.pose,
          });
        } else {
          console.warn("[Model Generation] State is READY but URL is still empty, continuing to poll...");
        }
      }

      // PROCESSING、PENDING、AWAITING_PROCESSINGの場合は待機して再試行
      if (state === "PROCESSING" || state === "PENDING" || state === "AWAITING_PROCESSING") {
        pollCount++;
        // 最初の5回は500ms、その後は1500ms
        const currentPollInterval = pollCount <= 5 ? initialPollIntervalMs : normalPollIntervalMs;
        const elapsed = Date.now() - (deadline - pollTimeoutMs);
        console.log(`[Model Generation] Still processing (state: ${state}, poll #${pollCount}, elapsed: ${Math.round(elapsed/1000)}s), waiting ${currentPollInterval}ms...`);
        await new Promise((r) => setTimeout(r, currentPollInterval));
        continue;
      }

      // エラー状態の場合は即座に返す
      if (state === "FAILED" || state === "ERROR") {
        console.error("[Model Generation] Export failed with state:", state);
        return NextResponse.json(
          { 
            error: "Export failed", 
            step: 2, 
            avatarId,
            state,
            exportResult 
          },
          { status: 500 }
        );
      }

      // 不明な状態の場合は待機して再試行
      pollCount++;
      const currentPollInterval = pollCount <= 5 ? initialPollIntervalMs : normalPollIntervalMs;
      console.warn(`[Model Generation] Unknown state: ${state}, continuing to poll (poll #${pollCount}, waiting ${currentPollInterval}ms)...`);
      await new Promise((r) => setTimeout(r, currentPollInterval));
    }

    // タイムアウト
    console.error("[Model Generation] Export timed out after", pollTimeoutMs, "ms");
    return NextResponse.json(
      { 
        error: "Export timed out", 
        step: 2, 
        avatarId, 
        lastExportResult: exportResult 
      },
      { status: 504 }
    );

  } catch (error) {
    console.error("[Model Generation] Error:", error);
    
    // トークン取得エラーの場合
    if (error instanceof Error) {
      if (error.message.includes("Meshcapade credentials not configured")) {
        return NextResponse.json(
          { 
            error: error.message,
            hint: "PoC用には MESHCAPADE_TOKEN を設定してください。本番用には MESHCAPADE_CLIENT_ID と MESHCAPADE_CLIENT_SECRET を設定してください。"
          },
          { status: 500 }
        );
      }
      if (error.message.includes("MESHCAPADE_CLIENT")) {
        return NextResponse.json(
          { error: "Meshcapade credentials not configured. Please set MESHCAPADE_CLIENT_ID and MESHCAPADE_CLIENT_SECRET." },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
