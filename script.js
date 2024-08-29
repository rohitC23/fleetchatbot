import axios from "axios";
import { embedDashboard } from "@superset-ui/embedded-sdk";

document.addEventListener("DOMContentLoaded", () => {
  const headerContainer = document.getElementById("header-div")
  const loginContainer = document.getElementById("login-container");
  const floatingIcon = document.getElementById("float-icon");
  const dashboard = document.getElementById("dashboard");
  const chatPopup = document.getElementById('chatPopup');
  const chatIcon = document.getElementById('chat-icon');
  const closeIcon = document.getElementById('close-icon'); 
  const userContainer = document.getElementById("user-container");
  const chatContainer = document.getElementById("chat-container");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMessage = document.getElementById("error-message");
  const addUser = document.getElementById("add-user");
  const logoutBtn = document.getElementById("logout-btn");

  // Check if user is already logged in
  const loggedInUser = localStorage.getItem("loggedInUser");
  if (loggedInUser) {
    loginContainer.style.display = "none";
    floatingIcon.style.display = "flex";
    headerContainer.style.display = "flex";
  }else{
    loginContainer.style.display = "flex";
    usernameInput.value = "";
    passwordInput.value = "";
  }

  loginBtn.addEventListener("click", () => {
    const enteredUsername = usernameInput.value;
    const enteredPassword = passwordInput.value;
  
    // Show the spinner and hide the button text
    loginBtn.classList.add("loading");
    loginBtn.disabled = true;
    errorMessage.textContent = "";
  
    fetch("http://127.0.0.1:8000/validate_credentials", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: enteredUsername, password: enteredPassword })
    })
    .then(response => response.json())
    .then(data => {
      // Hide the spinner and show the button text
      loginBtn.classList.remove("loading");
      loginBtn.disabled = false;
  
      if (data.success) {
        localStorage.setItem("loggedInUser", enteredUsername);
        localStorage.setItem("userPassword", enteredPassword); // Save the password in local storage
        loginContainer.style.display = "none";
        floatingIcon.style.display = "flex";
        headerContainer.style.display = "flex";
        chatIcon.style.display = "block"; // Ensure chatIcon is displayed initially after login
        closeIcon.style.display = "none";
  
        // Check the message in the response
        if (data.message === "Admin logged In") {
          document.getElementById("user-anchor").style.display = "block";
        } else {
          document.getElementById("user-anchor").style.display = "none";
        }
      } else {
        errorMessage.textContent = "Invalid username or password.";
      }
    })
    .catch(error => {
      console.error("Error:", error);
      errorMessage.textContent = "An error occurred. Please try again.";
  
      // Hide the spinner and show the button text
      loginBtn.classList.remove("loading");
      loginBtn.disabled = false;
    });
  });
  
  
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
        "How many orders are in dispatched statuses in May?",
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
  
      const loggedInUser = localStorage.getItem("loggedInUser");
      const userPassword = localStorage.getItem("userPassword");
  
      fetch("http://127.0.0.1:8000/get_response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          question: userInput,
          username: loggedInUser,
          password: userPassword
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          hideLoadingDots();
          console.log(data, "data");
          displayMessage(data, "bot");
        })
        .catch((error) => {
          hideLoadingDots();
          console.error("Error:", error);
        });
    }
  
    function displayMessage(data, sender) {
      const chatbox = document.getElementById("chatbox");
    
      // Create a message container element
      const messageElem = document.createElement("div");
      messageElem.classList.add("message", sender);
    
      // Create a span element for displaying the message text
      const messageSpan = document.createElement("span");
    
      // Helper function to format a single dictionary
      const formatMessage = (messageObj) => {
        return Object.entries(messageObj)
          .map(([key, value]) => `<strong>${key}</strong>: ${value}`)
          .join("<br>");
      };
    
      let formattedMessage;
      let containsError = false;
    
      if (Array.isArray(data.message)) {
        // If data.message is an array, format each dictionary and join them
        formattedMessage = data.message
          .map((messageObj) => {
            if (messageObj.error) {
              containsError = true;
            }
            return formatMessage(messageObj);
          })
          .join("<br><br>");
      } else {
        // If data.message is a single dictionary, format it directly
        const messageObj = JSON.parse(data.message);
        if (messageObj.error) {
          containsError = true;
        }
        formattedMessage = formatMessage(messageObj);
      }
    
      // Set the inner HTML of the span element with the formatted message
      messageSpan.innerHTML = formattedMessage;
    
      // Append the span element to the message container
      messageElem.appendChild(messageSpan);
    
      // Check if dashboard data is provided and there is no error in the message
      if (data.dashboardData && data.dashboardData.dashboardID && !containsError) {
        const idPara = document.createElement("p");
        idPara.classList.add("dashboard-id");
    
        const idLink = document.createElement("a");
        idLink.href = "#";
        idLink.textContent = ` ${data.dashboardData.dashboardName}`;
        idLink.onclick = function () {
          embedSupersetDashboard(data.dashboardData.dashboardID);
          const dashboard = document.getElementById("dashboard");
          dashboard.style.display = "block";
        };
    
        idPara.appendChild(idLink);
        messageElem.appendChild(idPara);

        chatbox.appendChild(messageElem);
    
        // Display interactive suggestions if they exist
        if (data.dashboardData.suggestions) {
          const suggestions = data.dashboardData.suggestions;
    
          // Create a container for suggestions
          const suggestionContainer = document.createElement("div");
          suggestionContainer.classList.add("suggestions");
    
          // Add each suggestion as a clickable button
          suggestions.forEach((suggestion) => {
            const suggestionElem = document.createElement("button");
            suggestionElem.classList.add("suggestion");
            suggestionElem.textContent = suggestion;
    
            // Add click event to populate input and send the message
            suggestionElem.addEventListener("click", () => {
              document.getElementById("user-input").value = suggestion;
              sendMessage();
              hideGreetingAndSuggestions(); // Hide suggestions after user clicks on a suggestion
            });
    
            suggestionContainer.appendChild(suggestionElem);
          });
    
          //messageElem.appendChild(suggestionContainer);
          chatbox.appendChild(suggestionContainer);
        }
      }
    
      // Append the message container to the chatbox
      //chatbox.appendChild(messageElem);
    
      // Scroll to the bottom of the chatbox
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

    document.getElementById('add-user').addEventListener('click', function() {
      // Hide chat header, chatbox, and user input container
      document.querySelector('.chat-header').style.display = 'none';
      document.getElementById('chatbox').style.display = 'none';
      document.getElementById('user-input-container').style.display = 'none';

      // Show the add user section
      document.getElementById('add-user-section').style.display = 'block';
  });

  document.getElementById('create-user').addEventListener('click', function() {
    const username = document.getElementById('new-username').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const messageElement = document.getElementById('message');

    if (username === "" || email === "") {
        // Display an error message if inputs are empty
        messageElement.textContent = "Please enter both username and email.";
        messageElement.style.color = "red";
    } else {
      // Display success message
      messageElement.textContent = "User created successfully.";
      messageElement.style.color = "blue";

      // After a short delay, hide the add user section and show chat elements
      setTimeout(function() {
          document.getElementById('add-user-section').style.display = 'none';
          document.querySelector('.chat-header').style.display = 'flex';
          document.getElementById('chatbox').style.display = 'block';
          document.getElementById('user-input-container').style.display = 'flex';

          // Clear the input fields and message
          document.getElementById('new-username').value = "";
          document.getElementById('new-email').value = "";
          messageElement.textContent = "";
      }, 1000); // Adjust the delay time as needed
    }
  });


    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("loggedInUser");
      localStorage.removeItem("userPassword");
      dashboard.style.display = "none";
      floatingIcon.style.display = "none";
      loginContainer.style.display = "flex";
      headerContainer.style.display = "none";
      chatPopup.style.display= "none";
      usernameInput.value = "";
      passwordInput.value = "";
      chatbox.innerHTML = ''; // Clear chat history
      chatInitialized = false; // Reset chat initialization flag
    });
  
  });  
  
