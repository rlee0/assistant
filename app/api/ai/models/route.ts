import { NextRequest, NextResponse } from 'next/server';
import { fetchModels } from '@/lib/ai/gateway-client';

export async function GET(request: NextRequest) {
  try {
    const models = await fetchModels();
    
    // Transform to expected format
    const formattedModels = models.map((model: any) => ({
      id: model.id || model.model_id,
      name: model.name || model.model_name || model.id,
      provider: model.provider || 'unknown',
      is_available: model.is_available !== false,
    }));

    return NextResponse.json(formattedModels);
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
