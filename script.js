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
        localStorage.setItem("userPassword", enteredPassword);
        localStorage.setItem("userRole", data.role); // Save the role to localStorage
        loginContainer.style.display = "none";
        floatingIcon.style.display = "flex";
        headerContainer.style.display = "flex";
        chatIcon.style.display = "block"; // Ensure chatIcon is displayed initially after login
        closeIcon.style.display = "none";
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
  
      const userRole = localStorage.getItem("userRole");
  
      fetch("http://127.0.0.1:8000/get_response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          question: userInput,
          role: userRole
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
    
      // Check if the data contains an error like "Access Error"
      if (data["Access Error"]) {
        // If there's an access error, display the error message
        formattedMessage = `<strong>Access Error</strong>: ${data["Access Error"]}`;
        containsError = true;
      } else if (Array.isArray(data.message)) {
        // If data.message is an array, format each dictionary and join them
        formattedMessage = data.message
          .map((messageObj) => formatMessage(messageObj))
          .join("<br><br>");
      } else if (data.message) {
        // If data.message is a single dictionary, format it directly
        formattedMessage = formatMessage(data.message);
      }
    
      // Set the inner HTML of the span element with the formatted message
      messageSpan.innerHTML = formattedMessage;
    
      // Append the span element to the message container
      messageElem.appendChild(messageSpan);
    
      // If there's no error, check and display dashboard data
      if (!containsError && data.dashboardData && data.dashboardData.dashboardID) {
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
      }
    
      // Append the message element to the chatbox
      chatbox.appendChild(messageElem);
    
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

  document.getElementById('web-scrape').addEventListener('click', function() {
    // Hide chat header, chatbox, and user input container
    document.querySelector('.chat-header').style.display = 'none';
    document.getElementById('chatbox').style.display = 'none';
    document.getElementById('user-input-container').style.display = 'none';

    // Show the add user section
    document.getElementById('web-scrape-section').style.display = 'block';
  });

  document.getElementById('create-user').addEventListener('click', function() {
    // Get the values from the input fields
    const username = document.getElementById('new-username').value.trim();
    const password = document.getElementById('new-email').value.trim();

    // Check if both fields are filled
    if (!username || !password) {
        alert('Please fill in both the username and password fields.');
        return; // Stop the function if fields are empty
    }

    // Get the admin credentials from local storage
    const adminUser = localStorage.getItem("loggedInUser");
    const adminPassword = localStorage.getItem("userPassword");
    const adminRole = localStorage.getItem("userRole");

    // Prepare the API body
    const requestBody = {
        "username": adminUser,
        "password": adminPassword,
        "sub_user": username,
        "sub_password": password,
        "role": adminRole
    };

    // Call the API to create the user
    fetch('http://127.0.0.1:8000/add_user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to create user');
        }
        return response.json();
    })
    .then(data => {
        //console.log('User created successfully:', data);

        // Create a <p> element to display the success message with styling
        const successMessage = document.createElement('p');
        successMessage.textContent = data.success; // Assuming `data.success` contains the success message
        successMessage.style.color = 'green';
        successMessage.style.backgroundColor = '#e6ffe6';  // Light green background
        successMessage.style.padding = '10px';
        successMessage.style.borderRadius = '5px';
        successMessage.style.textAlign = 'center';
        successMessage.style.fontSize = '16px';

        // Append the <p> element to the 'add-user-section'
        const addUserSection = document.getElementById('add-user-section');
        addUserSection.appendChild(successMessage);

        // Set a timer to hide the success message, change sections, and reset fields after 3 seconds
        setTimeout(() => {
            // Hide the success message
            addUserSection.removeChild(successMessage);

            // Hide the add user section
            document.getElementById('add-user-section').style.display = 'none';

            // Show chat header, chatbox, and user input container
            document.querySelector('.chat-header').style.display = 'flex';
            document.getElementById('chatbox').style.display = 'block';
            document.getElementById('user-input-container').style.display = 'flex';

            // Reset the input fields
            document.getElementById('new-username').value = '';
            document.getElementById('new-email').value = '';
        }, 3000); // 3000 milliseconds = 3 seconds
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating user. Please try again.');
    });
});

document.getElementById('search-btn').addEventListener('click', function() {
  // Get the values from the input fields
  const ordernumber = document.getElementById('order-number').value.trim();

  // Check if the order number field is filled
  if (!ordernumber) {
      alert('Please fill the order number field');
      return; // Stop the function if the field is empty
  }

  // Hide input and buttons
  document.getElementById('order-number').style.display = 'none';
  document.getElementById('search-btn').style.display = 'none';
  document.getElementById('exit-scrape').style.display = 'none';

  // Create and show the loading effect
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading';
  loadingDiv.innerHTML = `
    <p>Loading, please wait...</p>
    <div class="spinner"></div>
  `;

  // Append the loading element to the web-scrape-section
  document.getElementById('web-scrape-section').appendChild(loadingDiv);

  // Add CSS for the spinner and the animation
  const style = document.createElement('style');
  style.innerHTML = `
    .spinner {
      margin: 10px auto;
      border: 4px solid rgba(0, 0, 0, 0.1);
      border-left-color: #000;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Prepare the API body
  const requestBody = {
      "order_number": ordernumber
  };

  // Call the API to get the order status
  fetch('http://127.0.0.1:5000/order_status', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
  })
  .then(response => {
      if (!response.ok) {
          throw new Error('Failed to fetch order status');
      }
      return response.json();
  })
  .then(data => {
      console.log('Fetched Data successfully:', data);

      // Remove the loading effect
      document.getElementById('loading').remove();
      
      // Create a new div with the fetched data
      const dataDiv = document.createElement('div');
      dataDiv.id = 'web-data';
      dataDiv.innerHTML = `
        <p><strong>Flow Name:</strong> ${data.flow_name}</p>
        <p><strong>Tracking Info:</strong> ${data.tracking_info}</p>
      `;
      
      // Append the new div to the web-scrape-section
      document.getElementById('web-scrape-section').appendChild(dataDiv);

      // Create a new button
      const newButton = document.createElement('button');
      newButton.textContent = 'Back'; // Modify text as needed
      newButton.id = 'back-btn';
      
      // Append the button below the div
      document.getElementById('web-scrape-section').appendChild(newButton);

      newButton.addEventListener('click', function() {
        document.getElementById('web-data').style.display = 'none';
        document.getElementById('back-btn').style.display = 'none';
        document.getElementById('order-number').style.display = 'flex';
        document.getElementById('search-btn').style.display = 'flex';
        document.getElementById('exit-scrape').style.display = 'flex';
        document.getElementById('order-number').value = '';
      });
  })
  .catch(error => {
      console.error('Error:', error);
      
      // Remove the loading effect if error occurs
      document.getElementById('loading').remove();
      
      // Display an error message to the user
      alert('Error fetching data. Please try again later.');
  });
});


document.getElementById('exit').addEventListener('click', function() {
  // Hide the add user section
  document.getElementById('add-user-section').style.display = 'none';

  // Show chat header, chatbox, and user input container
  document.querySelector('.chat-header').style.display = 'flex';
  document.getElementById('chatbox').style.display = 'block';
  document.getElementById('user-input-container').style.display = 'flex';
});

document.getElementById('exit-scrape').addEventListener('click', function() {
  // Hide the add user section
  document.getElementById('web-scrape-section').style.display = 'none';

  // Show chat header, chatbox, and user input container
  document.querySelector('.chat-header').style.display = 'flex';
  document.getElementById('chatbox').style.display = 'block';
  document.getElementById('user-input-container').style.display = 'flex';
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
  
