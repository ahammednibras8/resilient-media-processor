import { createJob, uploadToGCS } from "@/api/jobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, Loader2, UploadIcon } from "lucide-react";
import React, { useCallback, useState } from "react";

type UploadState = "idle" | "requesting" | "uploading" | "success" | "error";

export default function Upload() {
    const [file, setFile] = useState<File | null>(null);
    const [state, setState] = useState<UploadState>("idle");
    const [progress, setProgress] = useState(0);
    const [jobId, setJobId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            setFile(selected);
            setState("idle");
            setError(null);
        }
    }, []);

    const handleUpload = useCallback(async () => {
        if (!file) return;

        try {
            setState("requesting");
            const job = await createJob({
                filename: file.name,
                content_type: file.type,
                size_bytes: file.size,
            });
            setJobId(job.job_id);

            setState("uploading");
            await uploadToGCS(job.upload_url, file, setProgress);

            setState("success");
        } catch (err) {
            setState("error");
            setError(err instanceof Error ? err.message : "Upload failed");
        }
    }, [file]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UploadIcon className="size-5" />
                        Upload Video
                    </CardTitle>
                    <CardDescription>
                        Select a video file to upload for processing
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* File Picker */}
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-input"
                        />
                        <label htmlFor="file-input" className="cursor-pointer block">
                            {file ? (
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">{file.name}</p>
                                    <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                                </div>
                            ) : (
                                <div className="text-muted-foreground">
                                    <UploadIcon className="size-8 mx-auto mb-2 opacity-50" />
                                    <p>Click to select a video file</p>
                                </div>
                            )}
                        </label>
                    </div>

                    {/* Progress Bar */}
                    {state === "uploading" && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>Uploading...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Success Message */}
                    {state === "success" && jobId && (
                        <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <CheckCircle className="size-5 text-green-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-green-600 dark:text-green-400">Upload complete!</p>
                                <p className="text-sm text-muted-foreground mt-1">Job ID: {jobId}</p>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {state === "error" && error && (
                        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                            <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-destructive">Upload failed</p>
                                <p className="text-sm text-muted-foreground mt-1">{error}</p>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || state === "uploading" || state === "requesting"}
                        className="w-full"
                        size="lg"
                    >
                        {state === "requesting" && (
                            <>
                                <Loader2 className="animate-spin" />
                                Getting upload URL...
                            </>
                        )}
                        {state === "uploading" && (
                            <>
                                <Loader2 className="animate-spin" />
                                Uploading...
                            </>
                        )}
                        {state === "success" && (
                            <>
                                <CheckCircle />
                                Uploaded!
                            </>
                        )}
                        {state === "error" && "Try Again"}
                        {state === "idle" && (
                            <>
                                <UploadIcon />
                                Upload
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}