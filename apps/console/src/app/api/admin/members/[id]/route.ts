import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Member Management API（Owner 専用）
 * 
 * PATCH: メンバーの権限を変更
 * DELETE: メンバーを削除
 */

// PATCH /api/admin/members/[id] - 権限変更
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[member API] PATCH request received for:", id);
    
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 現在のユーザーの profiles を取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // owner のみ実行可能
    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can update members" },
        { status: 403 }
      );
    }

    // 対象メンバーを取得
    const { data: targetMember, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // 同じショップのメンバーかチェック
    if (targetMember.shop_id !== profile.shop_id) {
      return NextResponse.json(
        { error: "Cannot update members from other shops" },
        { status: 403 }
      );
    }

    // 自分自身の権限変更は禁止
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot update your own role" },
        { status: 400 }
      );
    }

    // リクエストボディを取得
    const body = await request.json();
    const { role } = body;

    if (!role || !["owner", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'owner' or 'member'" },
        { status: 400 }
      );
    }

    // 権限を更新
    const { data: updatedMember, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("[member API] Error updating role:", updateError);
      return NextResponse.json(
        { error: "Failed to update role", details: updateError.message },
        { status: 500 }
      );
    }

    console.log("[member API] Role updated successfully:", id);

    return NextResponse.json({
      success: true,
      member: updatedMember,
    });
  } catch (error: any) {
    console.error("[member API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/members/[id] - メンバー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("[member API] DELETE request received for:", id);
    
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    // 現在のユーザーの profiles を取得
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // owner のみ実行可能
    if (profile.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can delete members" },
        { status: 403 }
      );
    }

    // 対象メンバーを取得
    const { data: targetMember, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("shop_id, role")
      .eq("id", id)
      .single();

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // 同じショップのメンバーかチェック
    if (targetMember.shop_id !== profile.shop_id) {
      return NextResponse.json(
        { error: "Cannot delete members from other shops" },
        { status: 403 }
      );
    }

    // 自分自身の削除は禁止
    if (id === user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // メンバーを削除（profiles から削除、auth.users は残す）
    const { error: deleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[member API] Error deleting member:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete member", details: deleteError.message },
        { status: 500 }
      );
    }

    console.log("[member API] Member deleted successfully:", id);

    // オプション: auth.users も削除する場合
    // await supabaseAdmin.auth.admin.deleteUser(params.id);

    return NextResponse.json({
      success: true,
      message: "Member deleted successfully",
    });
  } catch (error: any) {
    console.error("[member API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
