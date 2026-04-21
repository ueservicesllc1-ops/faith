const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
    region: "us-east-005",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    credentials: {
        accessKeyId: "005c2b526be0baa0000000032",
        secretAccessKey: "K005KJq+jjzp9+PwkqW7YGmoX3uooVY"
    }
});

async function main() {
    try {
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: "SAMPLER",
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: ["ETag"]
                    }
                ]
            }
        }));
        console.log("CORS updated successfully to allow PUT and DELETE.");
    } catch (e) {
        console.error(e);
    }
}

main();
