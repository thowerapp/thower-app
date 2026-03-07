import { Google } from 'arctic';
import {
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	VITE_GOOGLE_REDIRECT_URI
} from '$env/static/private';

export const google = new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, VITE_GOOGLE_REDIRECT_URI);
