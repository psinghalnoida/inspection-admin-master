import { NextResponse } from 'next/server';

// Routes that don't require authentication
const publicRoutes = ['/login', '/forgot-password', '/reset-password'];

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Allow public routes
    if (publicRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Allow static files and API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // static files
    ) {
        return NextResponse.next();
    }

    // Check for auth token in cookies (for SSR) or redirect to login
    // Note: Client-side auth check is done in the layout component
    // This middleware mainly handles initial page loads

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
