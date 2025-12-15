
/**
 * 透過 Telegram Bot API 發送訊息
 * 
 * 如何獲取 Token 與 Chat ID:
 * 1. 在 Telegram 搜尋 @BotFather，輸入 /newbot 建立機器人，獲取 Token。
 * 2. 在 Telegram 搜尋 @userinfobot (或其他 ID bot)，獲取您的 Chat ID。
 * 3. 記得先用您的帳號傳送至少一則訊息給您的機器人，以啟用對話權限。
 */
export const sendTelegramNotification = async (
    token: string, 
    chatId: string, 
    message: string
  ): Promise<boolean> => {
    if (!token || !chatId) {
        console.warn('Telegram Bot Token or Chat ID is missing.');
        return false;
    }
  
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML' // 支援簡易 HTML 格式 (bold, italic etc.)
            }),
        });
  
        const data = await response.json();
  
        if (!data.ok) {
            console.error('Telegram API Error:', data);
            return false;
        }
  
        return true;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        return false;
    }
  };
