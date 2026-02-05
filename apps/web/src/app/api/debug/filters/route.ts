import { NextResponse } from "next/server";
import { getFilterOptions } from "@/lib/db/queries";

export async function GET() {
    try {
        const options = await getFilterOptions();
        return NextResponse.json(options);
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
