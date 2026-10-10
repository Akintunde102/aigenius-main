import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GITHUB_API_URL = 'https://api.github.com/repos/Akintunde102/aigenius-main/releases/latest';

export async function GET(
  request: Request,
  { params }: { params: { platform: string } }
) {
  const platform = params.platform.toLowerCase();

  try {
    const res = await fetch(GITHUB_API_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes so we don't hit GitHub rate limits
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'AIGenius-Download-API',
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch latest release from GitHub', await res.text());
      return NextResponse.redirect(new URL('/', request.url));
    }

    const data = await res.json();
    
    let downloadUrl = '';

    // Find the correct asset from the latest GitHub release
    for (const asset of data.assets) {
      const name = asset.name.toLowerCase();
      
      if (platform === 'windows' && name.endsWith('.exe') && !name.includes('blockmap') && !name.includes('uninstaller')) {
        downloadUrl = asset.browser_download_url;
        break;
      }
      if (platform === 'linux' && name.endsWith('.deb')) {
        downloadUrl = asset.browser_download_url;
        break;
      }
      if (platform === 'macos' && name.endsWith('.dmg')) {
        downloadUrl = asset.browser_download_url;
        break;
      }
    }

    // If macOS asset not found in GitHub, fallback to custom env URL
    if (platform === 'macos' && !downloadUrl) {
       const macFallback = process.env.NEXT_PUBLIC_MAC_DESKTOP_DOWNLOAD_URL;
       if (macFallback) downloadUrl = macFallback;
    }

    if (downloadUrl) {
      return NextResponse.redirect(downloadUrl, 302);
    }

    // Fallback if no asset found
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Error fetching download URL:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
