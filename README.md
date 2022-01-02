# Anonymous-Smiles
This project allows people to anonymously share positive messages with each other!

The project integrates with Passport.js and MongoDB using the Mongoose ORM. Once a user makes an account through registration, they could submit anonymous positive messages
that are saved unto the database. The 'sentiment' npm package performs sentiment analysis on the String entered by the user and provides it with either a positive, neutral,
or negative score. Only messages that have a positive score are logged onto the database, and therefore, are rendered on the feed.
