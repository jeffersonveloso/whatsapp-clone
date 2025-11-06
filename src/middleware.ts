import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/(.*)'])

const publicUrl = process.env.NEXT_PUBLIC_APP_URL!;

const authorizedParties =
	process.env.NODE_ENV === 'production'
		? [ publicUrl,  publicUrl.replace("https://", "https://accounts.")]
		: ["http://localhost:3003"];

export default clerkMiddleware(
	async (auth, req) => {
		const { userId, redirectToSignIn } = await auth()

		if (!userId && isProtectedRoute(req)) {
			// Add custom logic to run before redirecting

			return redirectToSignIn()
		}
	},
	{ authorizedParties }
)

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		'/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
		// Always run for API routes
		'/(api|trpc)(.*)',
	],
}


