import { useState } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
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

  // DeepInfra OCR using Vercel AI SDK
  const deepinfra = createDeepInfra({
    apiKey: process.env.DEEPINFRA_API_KEY,
  });

  try {
    const result = await generateText({
      model: deepinfra("deepseek-ai/DeepSeek-OCR"),
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: arrayBuffer,
            },
          ],
        },
      ],
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
  const submit = useSubmit();

  const isSubmitting = nav.state === "submitting";

  return (
    <div className="page">
      <h1>OCR Demo</h1>
      <p>Select an image file to automatically run OCR.</p>

      <Form method="post" encType="multipart/form-data">
        <input
          type="file"
          name="image"
          accept="image/*"
          disabled={isSubmitting}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
              submit(e.currentTarget.form);
            } else {
              setPreview(null);
            }
          }}
        />
      </Form>

      <div className="content-wrapper">
        {preview && <img className="preview" src={preview} alt="preview" />}

        <div className="results-container">
          {isSubmitting && <p>Processing...</p>}
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
      </div>
    </div>
  );
}
