import "dotenv/config";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { Temporal } from "@js-temporal/polyfill";
import { getAIHSKWords } from "./ai.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function sendDiscordEmbed(channel, words) {
  if (!words || words.length === 0) return;

  const embed = new EmbedBuilder()
    .setTitle("📚 오늘의 HSK 단어")
    .setColor(0x5865f2)
    .setDescription("오늘도 중국어 공부 화이팅! 🇨🇳")
    .setTimestamp();

  words.forEach((w, i) => {
    embed.addFields({
      name: `${i + 1}. ${w.word} [${w.pinyin}]`,
      value: `**뜻:** ${w.definition}\n**예문:** ${w.example_cn}\n(${w.example_kr})`,
    });
  });

  await channel.send({ embeds: [embed] });
}

function getMillisecondsUntilNext9() {
  const now = Temporal.Now.zonedDateTimeISO("Asia/Seoul");
  let am9 = now.with({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  let pm9 = now.with({ hour: 21, minute: 0, second: 0, millisecond: 0 });

  let nextRun;
  if (Temporal.ZonedDateTime.compare(now, am9) < 0) {
    nextRun = am9;
  } else if (Temporal.ZonedDateTime.compare(now, pm9) < 0) {
    nextRun = pm9;
  } else {
    nextRun = am9.add({ days: 1 });
  }

  return Math.round(now.until(nextRun).total({ unit: "millisecond" }));
}

async function startNotificationLoop(client) {
  console.log("📡 채널 연결 시도 중... ID:", process.env.CHANNEL_ID);
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);

  if (!channel) {
    console.error("❌ 채널을 찾을 수 없어! CHANNEL_ID를 확인해봐.");
    return;
  }

  const run = async () => {
    console.log("🚀 AI 단어 생성 및 발송 시작...");
    try {
      const words = await getAIHSKWords();
      if (words && words.length > 0) {
        await sendDiscordEmbed(channel, words);
        console.log("✅ 발송 완료!");
      } else {
        console.warn(
          "⚠️ 생성된 단어가 없어. 재시도 로직을 타거나 API를 확인해야 함.",
        );
      }
    } catch (e) {
      console.error("❌ 발송 중 에러:", e);
    }

    const delay = getMillisecondsUntilNext9();
    console.log(
      `${(delay / 1000 / 60 / 60).toFixed(2)}시간 뒤에 다음 알림이 발송됩니다.`,
    );
    setTimeout(run, delay);
  };

  run();
}

client.once("ready", () => {
  console.log(`✅ 로그인 성공! 봇 이름: ${client.user.tag}`);
  startNotificationLoop(client).catch((err) =>
    console.error("Loop 시작 에러:", err),
  );
});

client.login(process.env.DISCORD_TOKEN);
