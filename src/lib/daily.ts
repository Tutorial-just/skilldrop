type DailyRoomResponse = {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config?: Record<string, unknown>;
};

type CreateDailyRoomInput = {
  roomName: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

export async function createDailyRoom({
  roomName,
  startsAt,
  endsAt,
}: CreateDailyRoomInput): Promise<DailyRoomResponse> {
  const apiKey = process.env.DAILY_API_KEY;
  const apiUrl = process.env.DAILY_API_URL ?? "https://api.daily.co/v1";

  if (!apiKey) {
    throw new Error("DAILY_API_KEY is not set.");
  }

  const response = await fetch(`${apiUrl}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: roomName,
      privacy: "public",
      properties: {
        enable_prejoin_ui: true,
        enable_screenshare: true,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        exp: endsAt ? Math.floor(endsAt.getTime() / 1000) + 60 * 60 : undefined,
        nbf: startsAt ? Math.floor(startsAt.getTime() / 1000) - 60 * 15 : undefined,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Failed to create Daily room. Status: ${response.status}. Body: ${errorText}`,
    );
  }

  return response.json();
}