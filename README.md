<!-- PROJECT LOGO -->
<br />
<div align="center">
<h3 align="center">Motivatchi</h3>
  <p align="center">
    Motivatchi is a web-based productivity app based on the popular 2000s game Tamagotchi. Grow and care for an adorable virtual pet by completing your day-to-day tasks and achieving your goals!
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

### Built With

* Python
* Django
* SQLite
* HTML

### Project Management Tools

* [GitHub Projects](https://github.com/orgs/ECE444-2025FALL-UofT/projects/6) (for issue tracking)
* [GitHub Repository](https://github.com/ECE444-2025FALL-UofT/project-1-web-application-development-group8-motivatchi)
* OneDrive (Private)


<!-- GETTING STARTED -->
## Getting Started

Here is how to get the project set up in your local environment.

### Installation

This process will clone the repository and set up a local database for development and testing. 

1. Clone the repo
   ```sh
   git clone https://github.com/ECE444-2025FALL-UofT/project-1-web-application-development-group8-motivatchi.git
   ```
2. Create and activate a virtual environment 
   ```sh
   # for Windows
   python -m venv venv
   venv\Scripts\activate

   # for Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies
   ```sh
   pip install -r requirements.txt
   ```
4. Run migrations to create your local database
   ```sh
   python manage.py migrate
   ```
5. Create a superuser
   ```sh
   python manage.py createsuperuser
   ```
6. Start Django server
   ```sh
   python manage.py runserver
   ```
7. Access the website at http://127.0.0.1:8000/
8. Test your admin account by logging in here http://127.0.0.1:8000/admin/ 


<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [README Template](https://github.com/othneildrew/Best-README-Template)
