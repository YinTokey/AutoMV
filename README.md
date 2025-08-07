# Auto-MV Creator

AutoMV is a web app that transforms your ideas into music videos.

## Demo

[<img src="https://img.youtube.com/vi/ZL0Uz-EWJhc/hqdefault.jpg"
/>](https://www.youtube.com/embed/ZL0Uz-EWJhc)

## Explanation
[<img src="https://img.youtube.com/vi/BrnLtW4E-do/hqdefault.jpg"
/>](https://www.youtube.com/embed/BrnLtW4E-do)

## More Video Samples

- [Sample 1](https://www.youtube.com/watch?v=S1xqjLtWxyg)
- [Sample 2](https://www.youtube.com/watch?v=A9PidgjVKAY)
- [Sample 3](https://www.youtube.com/watch?v=Wk1UlChM6F0)
- [Sample 4](https://www.youtube.com/watch?v=Bwkw4_9h33E)
- [Sample 5](https://www.youtube.com/watch?v=J4nt193CcVQ)

## Required API Services

- [OpenAI API](https://platform.openai.com/) – for prompt and scene generation
- [Runware API](https://runware.ai/) – for image generation
- [Suno API](https://sunoapi.org/) – for music generation
- [Supabase](https://supabase.com/) – for database and storage

You will need API keys for each service. Sign up and obtain your keys from the official sites above.

## Install FFmpeg
**Windows**
[Video Tutorial](https://www.youtube.com/watch?v=JR36oH35Fgg
)

**Mac**
```
brew install ffmpeg
```


## Deploying the Webhook

The webhook service (in the `webhook/` folder) is required for handling music status updates and callbacks from the Suno API. It must be running for the main app to receive music generation results.

1.  **Install Vercel CLI if you haven't:**
    ```bash
    npm install -g vercel
    ```
2.  **Deploy the webhook to Vercel:**
    ```bash
    cd webhook
    vercel
    ```
3.  **Set up environment variables on Vercel:**
    Add the following environment variables in your Vercel project settings:
    ```env
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
    Then, deploy it again.

## Setup main-app

1.  **Install dependencies:**
    ```bash
    cd main-app
    npm install
    ```
2.  **Set up environment variables:**
    Set up your `.env` file like this:
    ```env
    RUNWARE_API_KEY=your_key
    OPENAI_API_KEY=your_key
    SUNO_API_KEY=your_key
    WEBHOOK_VERCEL_URL=your_webhook_vercel_url
    ```
3.  **Set up the database schema:**
    Run the `supabase-schema.sql` file in your Supabase project to create the necessary tables and triggers for music generation tasks.
4.  **Run the development server:**
    ```bash
    npm run dev
    ```
5.  **Open your browser:**
    Visit [http://localhost:3000](http://localhost:3000)

## License

MIT
