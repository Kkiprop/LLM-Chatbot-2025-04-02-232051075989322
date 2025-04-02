import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { backend } from 'declarations/backend'; // Ensure this points to the correct Motoko canister
import botImg from '/logo.svg';
import userImg from '/user.svg';
import '/index.css';
import axios from 'axios'; // Import axios for API calls

const App = () => {
  const [chat, setChat] = useState([
    {
      role: { system: null },
      content: "I help you build the best trading portfolio"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBoxRef = useRef(null);

  const formatDate = (date) => {
    const h = '0' + date.getHours();
    const m = '0' + date.getMinutes();
    return `${h.slice(-2)}:${m.slice(-2)}`;
  };

  // Function to fetch crypto data from CoinGecko API
  const fetchCryptoData = async () => {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: 'bitcoin,ethereum,ripple', // Add more coins here as needed
          order: 'market_cap_desc',
        },
      });

      return response.data; // Return the data from the API
    } catch (e) {
      console.error("Error fetching crypto data:", e);
      return null; // In case of an error, return null
    }
  };

  // Function to construct the prompt to send to the AI backend
  const constructPrompt = (userMessage, cryptoData) => {
    let prompt = `User message: ${userMessage}\n\n`;
    prompt += "Crypto data:\n";
    
    // Add crypto data to the prompt
    cryptoData.forEach((coin) => {
      prompt += `${coin.name} (${coin.symbol.toUpperCase()}): $${coin.current_price}\n`;
    });

    prompt += "\nProvide investment advice based on the above data and user message.";
    return prompt;
  };

  // Function to handle the AI query
  const askAgent = async (messages) => {
    try {
      const userMessage = messages[messages.length - 1].content;

      // Fetch crypto data from CoinGecko
      const cryptoData = await fetchCryptoData();
      if (!cryptoData) {
        setChat((prevChat) => {
          const newChat = [...prevChat];
          newChat.pop();
          newChat.push({ role: { system: null }, content: "Sorry, couldn't fetch crypto data." });
          return newChat;
        });
        return;
      }

      // Construct the prompt with the crypto data
      const prompt = constructPrompt(userMessage, cryptoData);

      // Send the prompt to the backend for AI processing
      const response = await backend.chat([{ role: { user: null }, content: prompt }]);
      setChat((prevChat) => {
        const newChat = [...prevChat];
        newChat.pop(); // Remove the 'Thinking ...' message
        newChat.push({ role: { system: null }, content: response });
        return newChat;
      });
    } catch (e) {
      console.error(e);
      const eStr = String(e);
      const match = eStr.match(/(SysTransient|CanisterReject), \\+"([^\\"]+)/);
      if (match) {
        alert(match[2]);
      }
      setChat((prevChat) => {
        const newChat = [...prevChat];
        newChat.pop();
        return newChat;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: { user: null },
      content: inputValue
    };
    const thinkingMessage = {
      role: { system: null },
      content: 'Thinking ...'
    };
    setChat((prevChat) => [...prevChat, userMessage, thinkingMessage]);
    setInputValue('');
    setIsLoading(true);
    const messagesToSend = chat.slice(1).concat(userMessage);
    askAgent(messagesToSend);
  };

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chat]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-lg">
        {/* Flex Cards Above the Chat Box */}
        <div className="flex space-x-4 p-4">
          <div className="flex-1 bg-blue-100 rounded-lg p-4 shadow-lg">
            <h3 className="font-bold text-lg">Market Gap Analysis</h3>
            <p>Identify areas in the market with high demand and low competition to focus your investments.</p>
          </div>
          <div className="flex-1 bg-green-100 rounded-lg p-4 shadow-lg">
            <h3 className="font-bold text-lg">Discount Hunting</h3>
            <p>Stay ahead of trends by tracking discounts and opportunities to buy assets at a lower price.</p>
          </div>
          <div className="flex-1 bg-yellow-100 rounded-lg p-4 shadow-lg">
            <h3 className="font-bold text-lg">Investment Advice</h3>
            <p>Receive expert insights and tips on making wise investment decisions based on current market conditions.</p>
          </div>
        </div>

        {/* Chat Container */}
        <div className="flex-1 overflow-y-auto rounded-t-lg bg-gray-100 p-4" ref={chatBoxRef}>
          {chat.map((message, index) => {
            const isUser = 'user' in message.role;
            const img = isUser ? userImg : botImg;
            const name = isUser ? 'User' : 'System';
            const text = message.content;

            return (
              <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
                {!isUser && (
                  <div
                    className="mr-2 h-10 w-10 rounded-full"
                    style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                  ></div>
                )}
                <div className={`max-w-[70%] rounded-lg p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-white shadow'}`}>
                  <div
                    className={`mb-1 flex items-center justify-between text-sm ${isUser ? 'text-white' : 'text-gray-500'}`}
                  >
                    <div>{name}</div>
                    <div className="mx-2">{formatDate(new Date())}</div>
                  </div>
                  <div>{text}</div>
                </div>
                {isUser && (
                  <div
                    className="ml-2 h-10 w-10 rounded-full"
                    style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover' }}
                  ></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Input Box */}
        <form className="flex rounded-b-lg border-t bg-white p-4" onSubmit={handleSubmit}>
          <input
            type="text"
            className="flex-1 rounded-l border p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask anything ..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="rounded-r bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
