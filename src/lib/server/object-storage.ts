import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';

const railwayKeyPrefix = 'railway:';

function requiredEnv(...names: string[]) {
	for (const name of names) {
		const value = env[name];
		if (value) return value;
	}
	throw new Error(`Brak wymaganej zmiennej środowiskowej ${names.join(' lub ')}.`);
}

function storageConfig() {
	return {
		bucket: requiredEnv('AWS_S3_BUCKET_NAME', 'BUCKET'),
		endpoint: requiredEnv('AWS_ENDPOINT_URL', 'ENDPOINT'),
		region: env.AWS_DEFAULT_REGION || env.REGION || 'auto',
		accessKeyId: requiredEnv('AWS_ACCESS_KEY_ID', 'ACCESS_KEY_ID'),
		secretAccessKey: requiredEnv('AWS_SECRET_ACCESS_KEY', 'SECRET_ACCESS_KEY')
	};
}

function storageClient() {
	const config = storageConfig();
	return {
		bucket: config.bucket,
		client: new S3Client({
			region: config.region,
			endpoint: config.endpoint,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey
			}
		})
	};
}

function userPrefix(userId: string) {
	return createHash('sha256').update(userId).digest('hex').slice(0, 32);
}

export function createMilestoneObjectKey(userId: string, extension: string) {
	return `milestones/${userPrefix(userId)}/${randomUUID()}${extension}`;
}

export function storedMilestoneImage(key: string) {
	return `${railwayKeyPrefix}${key}`;
}

export function milestoneObjectBelongsToUser(key: string, userId: string) {
	return key.startsWith(`milestones/${userPrefix(userId)}/`);
}

export async function createMilestoneUpload(key: string, contentType: string) {
	const { bucket, client } = storageClient();
	return createPresignedPost(client, {
		Bucket: bucket,
		Key: key,
		Expires: 10 * 60,
		Fields: { 'Content-Type': contentType },
		Conditions: [
			['eq', '$Content-Type', contentType],
			['content-length-range', 1, 5 * 1024 * 1024]
		]
	});
}

export async function resolveMilestoneImage(value: string | null) {
	if (!value?.startsWith(railwayKeyPrefix)) return value;

	const { bucket, client } = storageClient();
	return getSignedUrl(
		client,
		new GetObjectCommand({ Bucket: bucket, Key: value.slice(railwayKeyPrefix.length) }),
		{ expiresIn: 60 * 60 }
	);
}
