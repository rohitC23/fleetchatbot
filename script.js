import axios from "axios";
import { embedDashboard } from "@superset-ui/embedded-sdk";

document.addEventListener("DOMContentLoaded", () => {

  const apiUrl = "https://analytics.logisticsstudio.com/api/v1/security";
  
  function fetchAccessToken() {
    const body = {
      username: "RAG",
      password: "rag@12345",
      provider: "db",
      refresh: "False",
    };

    return axios.post(`${apiUrl}/login`, body, {
      headers: { "Content-Type": "application/json" },
    });
  }

  function fetchGuestToken(accessToken, dashboardID) {
    const body = {
      resources: [
        {
          id: dashboardID,
          type: "dashboard",
        },
      ],
      rls: [],
      user: {
        first_name: "RAG",
        last_name: "RAG",
        username: "RAG",
      },
    };

    const acc = accessToken.access_token;
    return axios.post(`${apiUrl}/guest_token/`, body, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${acc}`,
      },
    });
  }

  function getGuestToken(dashboardID) {
    return fetchAccessToken()
      .then((response) => fetchGuestToken(response.data, dashboardID))
      .catch((error) => {
        console.error(error);
        throw error;
      });
  }

  function embedSupersetDashboard(dashboardID) {
    const dashboardElement = document.querySelector("#dashboard");

    if (dashboardElement) {
      getGuestToken(dashboardID).then(
        (response) => {
          const token = response.data.token;
          embedDashboard({
            id: dashboardID,
            supersetDomain: "https://analytics.logisticsstudio.com",
            mountPoint: dashboardElement,
            fetchGuestToken: () => Promise.resolve(token),
            dashboardUiConfig: {
              hideTitle: true,
              hideChartControls: true,
              hideTab: true,
            },
          })
            .then(() => {
              const iframe = dashboardElement.querySelector("iframe");
              if (iframe) {
                iframe.style.width = "100%";
                iframe.style.height = "100vh";
              }
            })
            .catch((error) => {
              console.error(error);
            });
        },
        (error) => {
          console.error(error);
        }
      );
    }
  }

    let userActive = false;
    let chatInitialized = false; // Flag to check if the chat has been initialized
  
    function initializeChat() {
      displayInputMessage("Hi, I'm Fleet Enable's AI. Ask me anything for example:", "bot");
      displaySuggestions();
  
      document.getElementById("send-btn").addEventListener("click", () => {
        sendMessage();
        hideGreetingAndSuggestions(); // Hide greeting and suggestions after user clicks send
      });
  
      document.getElementById("user-input").addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          sendMessage();
          hideGreetingAndSuggestions(); // Hide greeting and suggestions after user presses Enter
        }
      });
    }
  
    function displayInputMessage(data, sender) {
      const chatbox = document.getElementById("chatbox");
      const messageElem = document.createElement("div");
      messageElem.classList.add("message", sender);
      messageElem.innerHTML = data;
      chatbox.appendChild(messageElem);
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  
    function displaySuggestions() {
      const chatbox = document.getElementById("chatbox");
      const suggestions = [
        "What is the total revenue generated in May?",
        "How many orders are in exception status?",
        "How many orders are in completed and dispatched statuses in May?",
        "What is our average revenue per order?"
      ];
  
      const suggestionContainer = document.createElement("div");
      suggestionContainer.classList.add("suggestions");
  
      suggestions.forEach(suggestion => {
        const suggestionElem = document.createElement("button");
        suggestionElem.classList.add("suggestion");
        suggestionElem.textContent = suggestion;
        suggestionElem.addEventListener("click", () => {
          document.getElementById("user-input").value = suggestion;
          sendMessage();
          hideGreetingAndSuggestions(); // Hide greeting and suggestions after user clicks on a suggestion
        });
        suggestionContainer.appendChild(suggestionElem);
      });
  
      chatbox.appendChild(suggestionContainer);
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  
    function sendMessage() {
      const userInput = document.getElementById("user-input").value;
      if (userInput.trim() === "") return;
      displayInputMessage(userInput, "user");
      document.getElementById("user-input").value = "";
      showLoadingDots();
      fetch("http://127.0.0.1:5000/get_response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: userInput }),
      })
        .then((response) => response.json())
        .then((data) => {
          hideLoadingDots();
          console.log(data, "data");
          displayMessage(data, "bot");
          userActive = true; // Set userActive to true when a response is received
        })
        .catch((error) => {
          hideLoadingDots();
          console.error("Error:", error);
        });
    }
  
    function displayMessage(data, sender) {
      const chatbox = document.getElementById("chatbox");
    
      const messageElem = document.createElement("div");
      messageElem.classList.add("message", sender);
    
      const messageSpan = document.createElement("span");
    
      function formatMessage(obj) {
        return Object.entries(obj).map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            return `<strong>${key}</strong>: <br>${formatMessage(value)}`;
          }
          return `<strong>${key}</strong>: ${value}`;
        }).join("<br>");
      }
    
      const messageObj = JSON.parse(data.message);
      const formattedMessage = formatMessage(messageObj);
    
      messageSpan.innerHTML = formattedMessage;
    
      messageElem.appendChild(messageSpan);
    
      if (data.dashboardData && data.dashboardData.dashboardID) {
        const idPara = document.createElement("p");
        idPara.classList.add("dashboard-id");
    
        const idLink = document.createElement("a");
        idLink.href = "#";
        idLink.textContent = ` ${data.dashboardData.dashboardName}`;
        idLink.onclick = function() {
          embedSupersetDashboard(data.dashboardData.dashboardID);
          const dashboard = document.getElementById("dashboard");
          dashboard.style.display = "block";
        };
    
        idPara.appendChild(idLink);
    
        messageElem.appendChild(idPara);
      }
    
      chatbox.appendChild(messageElem);
      chatbox.scrollTop = chatbox.scrollHeight;
    }    
  
    function showLoadingDots() {
      const chatbox = document.getElementById("chatbox");
      const loadingDots = document.createElement("div");
      loadingDots.id = "loading-dots";
      loadingDots.classList.add("loading");
      loadingDots.innerHTML = `
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      `;
      chatbox.appendChild(loadingDots);
      chatbox.scrollTop = chatbox.scrollHeight;
    }
  
    function hideLoadingDots() {
      const loadingDots = document.getElementById("loading-dots");
      if (loadingDots) {
        loadingDots.remove();
      }
    }
  
    function hideGreetingAndSuggestions() {
      const suggestionsContainer = document.querySelector('.suggestions');
      if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none'; // Hide the suggestions container
      }
  
      const greetingMessage = document.querySelector('.message.bot');
      if (greetingMessage) {
        greetingMessage.style.display = 'none'; // Hide the greeting message
      }
    }
  
    window.toggleChatBot = function () {
      const chatPopup = document.getElementById('chatPopup');
      const chatIcon = document.getElementById('chat-icon');
      const closeIcon = document.getElementById('close-icon');
  
      if (chatPopup.style.display === 'none' || chatPopup.style.display === '') {
          chatPopup.style.display = 'flex';
          chatIcon.style.display = 'none';
          closeIcon.style.display = 'block';
  
          if (!chatInitialized) {
              initializeChat(); // Initialize the chat only if it hasn't been initialized
              chatInitialized = true; // Set the flag to true after initialization
          }
      } else {
          chatPopup.style.display = 'none';
          chatIcon.style.display = 'block';
          closeIcon.style.display = 'none';
      }
    };
  
  });  
  