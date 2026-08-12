export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    const { image, prompt } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: 'ไม่พบรูปภาพ'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY'
      });
    }

    // แปลง Base64 เป็นไฟล์สำหรับส่งไป OpenAI
    const matches = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!matches) {
      return res.status(400).json({
        error: 'รูปภาพไม่อยู่ในรูปแบบที่รองรับ'
      });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const imageBuffer = Buffer.from(base64Data, 'base64');

    const extension =
      mimeType === 'image/jpeg' ? 'jpg' :
      mimeType === 'image/webp' ? 'webp' :
      'png';

    const blob = new Blob(
      [imageBuffer],
      { type: mimeType }
    );

    const form = new FormData();

    form.append('model', 'gpt-image-1.5');

    form.append(
      'prompt',
      prompt ||
      'Create a realistic fashion try-on image using the uploaded person as the identity reference. Preserve the person appearance and facial identity as much as possible. Show a natural full-body fashion photograph.'
    );

    form.append(
      'image',
      blob,
      `person.${extension}`
    );

    const response = await fetch(
      'https://api.openai.com/v1/images/edits',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: form
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API Error:', data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          'ไม่สามารถสร้างภาพ AI ได้'
      });
    }

    const generatedImage =
      data?.data?.[0]?.b64_json;

    if (!generatedImage) {
      return res.status(500).json({
        error: 'AI ไม่ได้ส่งภาพกลับมา'
      });
    }

    return res.status(200).json({
      success: true,
      image: `data:image/png;base64,${generatedImage}`
    });

  } catch (error) {

    console.error('Try-On API Error:', error);

    return res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการสร้างภาพ'
    });
  }
}
