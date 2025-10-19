import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  const dataDir = path.join(process.cwd(), 'data');
  const testFile = path.join(dataDir, '__fs_test__.txt');
  const res: any = { dataDir, readable: false, writable: false, cleaned: false, error: null };
  try {
    await fs.readdir(dataDir);
    res.readable = true;
    await fs.writeFile(testFile, 'ok');
    res.writable = true;
    await fs.unlink(testFile);
    res.cleaned = true;
  } catch (e: any) {
    res.error = e?.message || String(e);
  }
  return NextResponse.json(res);
}
