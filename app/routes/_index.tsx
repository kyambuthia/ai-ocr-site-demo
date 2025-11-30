import { useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import type { ActionFunctionArgs } from "react-router";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { generateText } from "ai";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!file || typeof file === "string" || !file.size) {
    return { error: "No image uploaded" };
  }

  // Convert file to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // DeepInfra OCR using Vercel AI SDK
  const deepinfra = createDeepInfra({
    apiKey: process.env.DEEPINFRA_API_KEY,
  });

  try {
    const result = await generateText({
      model: deepinfra("deepseek-ai/DeepSeek-OCR"),
      prompt: "Extract all readable text from this image.",
      // @ts-expect-error - The AI SDK types are not up to date with multi-modal inputs
      input: bytes,
    });
    return { text: result.text, finishReason: result.finishReason, usage: result.usage };
  } catch (error) {
    console.error(error);
    return { error: "Failed to process image with OCR." };
  }
}

export default function Index() {
  const actionData = useActionData() as
    | { text?: string; error?: string; finishReason?: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }
    | undefined;
  const nav = useNavigation();
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="page">
      <h1>OCR Demo</h1>

      <Form method="post" encType="multipart/form-data">
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
            } else {
              setPreview(null);
            }
          }}
        />
        <button type="submit" disabled={nav.state === "submitting"}>
          {nav.state === "submitting" ? "Processing..." : "Run OCR"}
        </button>
      </Form>

      {preview && <img className="preview" src={preview} alt="preview" />}

      {actionData?.error && <p className="error">{actionData.error}</p>}
      {actionData?.text && (
        <div className="output">
          <h2>Extracted Text</h2>
          <pre>{actionData.text}</pre>
          {actionData.finishReason && (
            <p><strong>Finish Reason:</strong> {actionData.finishReason}</p>
          )}
          {actionData.usage && (
            <div>
              <h3>Usage</h3>
              <p><strong>Prompt Tokens:</strong> {actionData.usage.promptTokens}</p>
              <p><strong>Completion Tokens:</strong> {actionData.usage.completionTokens}</p>
              <p><strong>Total Tokens:</strong> {actionData.usage.totalTokens}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
