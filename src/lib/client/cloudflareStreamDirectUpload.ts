/**
 * Upload « Basic POST » sur l’URL one-shot renvoyée par `.../stream/direct_upload`.
 * C’est le flux documenté côté navigateur pour les fichiers de moins de 200 Mio
 * (multipart, clé `file`) —
 * *pas* l’en-tête TUS de création, qui reçoit un 400 « Decoding Error » sur `upload.cloudflarestream.com/…`.
 * @see https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/#basic-post-request
 */
export const CLOUDFLARE_STREAM_BASIC_POST_MAX_BYTES = 200 * 1024 * 1024;

export function uploadCloudflareStreamBasicPost(
	file: File,
	uploadUrl: string,
	onProgress: (bytesSent: number, bytesTotal: number) => void
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('POST', uploadUrl);
		xhr.upload.addEventListener('progress', (e) => {
			if (e.lengthComputable) onProgress(e.loaded, e.total);
		});
		xhr.addEventListener('load', () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress(file.size, file.size);
				resolve();
				return;
			}
			const msg = (xhr.responseText && xhr.responseText.slice(0, 500)) || xhr.statusText;
			reject(new Error(msg || `Upload refusé (${xhr.status})`));
		});
		xhr.addEventListener('error', () => reject(new Error('Échec réseau (upload).')));
		const body = new FormData();
		body.append('file', file, file.name);
		xhr.send(body);
	});
}
