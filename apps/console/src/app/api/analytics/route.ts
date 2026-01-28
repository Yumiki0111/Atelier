import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type TimeRange = "24h" | "7d" | "30d" | "90d";

interface AnalyticsData {
  date: string;
  fullDate: string;
  キューブ表示数: number;
  キューブクリック数: number;
  ウィジェット開封数: number;
  会話数: number;
  メッセージ数: number;
  カート追加: number;
}

function getTimeRangeDates(timeRange: TimeRange): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (timeRange) {
    case "24h":
      startDate.setHours(startDate.getHours() - 24);
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
  }
  
  return { startDate, endDate };
}

function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const shopId = searchParams.get("shopId");
    const timeRange = (searchParams.get("timeRange") || "30d") as TimeRange;

    if (!shopId) {
      return NextResponse.json(
        { error: "shopId is required" },
        { status: 400 }
      );
    }

    const { startDate, endDate } = getTimeRangeDates(timeRange);
    
    // イベントデータを取得
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("type, created_at, product_id")
      .eq("shop_id", shopId)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: true });

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    // 日付範囲を生成
    const dateRange = generateDateRange(startDate, endDate);
    
    // 日次データを初期化
    const dailyData = new Map<string, AnalyticsData>();
    
    dateRange.forEach((date) => {
      const dateKey = date.toISOString().split("T")[0];
      dailyData.set(dateKey, {
        date: date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
        fullDate: date.toLocaleDateString("ja-JP"),
        キューブ表示数: 0,
        キューブクリック数: 0,
        ウィジェット開封数: 0,
        会話数: 0,
        メッセージ数: 0,
        カート追加: 0,
      });
    });

    // イベントを集計
    events?.forEach((event) => {
      const eventDate = new Date(event.created_at);
      const dateKey = eventDate.toISOString().split("T")[0];
      const dayData = dailyData.get(dateKey);
      
      if (!dayData) return;

      switch (event.type) {
        case "cube_view":
          dayData.キューブ表示数 += 1;
          break;
        case "cube_click":
          dayData.キューブクリック数 += 1;
          break;
        case "widget_open":
          dayData.ウィジェット開封数 += 1;
          break;
        case "add_to_cart_click":
          dayData.カート追加 += 1;
          break;
        default:
          break;
      }
    });

    // 会話ログを集計（conversationsテーブルから）
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from("conversations")
      .select("id, started_at")
      .eq("shop_id", shopId)
      .gte("started_at", startDate.toISOString())
      .lte("started_at", endDate.toISOString());

    if (conversationsError) {
      console.error("Error fetching conversations:", conversationsError);
    } else {
      conversations?.forEach((conv) => {
        const convDate = new Date(conv.started_at);
        const dateKey = convDate.toISOString().split("T")[0];
        const dayData = dailyData.get(dateKey);
        if (dayData) {
          dayData.会話数 += 1;
        }
      });
    }

    // メッセージ数を集計（messagesテーブルから）
    // まず、該当するshop_idのconversation_idを取得
    const conversationIds = conversations?.map((c) => c.id) || [];
    
    if (conversationIds.length > 0) {
      const { data: messages, error: messagesError } = await supabaseAdmin
        .from("messages")
        .select("id, created_at")
        .in("conversation_id", conversationIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
      } else {
        messages?.forEach((msg) => {
          const msgDate = new Date(msg.created_at);
          const dateKey = msgDate.toISOString().split("T")[0];
          const dayData = dailyData.get(dateKey);
          if (dayData) {
            dayData.メッセージ数 += 1;
          }
        });
      }
    }

    // 配列に変換して返す
    const result = Array.from(dailyData.values());

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
