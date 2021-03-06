import firebase from 'firebase';
import GeoFire from 'geofire';

import config from '../config.js'

const headers = {
'Accept-Encoding': 'gzip',
'X-TITLE-ID': 'semc-vainglory',
'Accept': 'application/vnd.api+json',
'Authorization': 'Bearer ' + config.VG_API_KEY
}

const firebaseOptions = {
  apiKey: config.FB_API_KEY,
  authDomain: "vainglory-b9110.firebaseapp.com",
  databaseURL: "https://vainglory-b9110.firebaseio.com",
  storageBucket: "vainglory-b9110.appspot.com",
  messagingSenderId: "713619624038"
};

firebase.initializeApp(firebaseOptions);

const firebaseRef = firebase.database();
const dataBase = {
  'na': new GeoFire(firebaseRef.ref('locations/na')),
  'eu': new GeoFire(firebaseRef.ref('locations/eu')),
  'ea': new GeoFire(firebaseRef.ref('locations/ea')),
  'sa': new GeoFire(firebaseRef.ref('locations/sa')),
  'sea': new GeoFire(firebaseRef.ref('locations/sea'))
}

export const setUserData = (user) => {
  return {
    type: "SET_USER_DATA",
    ...user
  };
}

export const fetchUserData = (user) => {
  return (dispatch, getState) => {
    const { pos, timestamp } = getState().user;
    fetch('https://api.dc01.gamelockerapp.com/shards/'+user.region+'/players?filter[playerName]='+user.name, {headers: headers})
      .then((response) => {
        //console.log(response) // see response object here. How can we show the user 404, etc...
        // we have to prevent misregion here
        return response.json()
      })
      .then((responseJson) => {
        // Save user data in Firebase
        dataBase[user.region].set(responseJson.data[0].id, pos);
        firebaseRef.ref().child('locations/'+user.region+'/'+responseJson.data[0].id).update({...responseJson.data[0], timestamp});
        return dispatch(setUserData(user));
      })
      .catch((error) => {
        console.log(error.message);
    });
  }
}

export const setUserPosition = (lat, lon, timestamp) => {
  return {
    type: "SET_USER_POS",
    lat, lon, timestamp
  };
}

export const addNewPlayer = (player) => {
  return {
    type: "ADD_NEW_PLAYER",
    player
  };
}

export const fetchNearbyUsers = (region) => { // obligé de passer region ?
  return (dispatch, getState) => {
      const pos = getState().user.pos;
      const geoQuery = dataBase[region].query({
      center: pos, // User geoloc
      radius: 1500000 // 15000km around for now
    });

    geoQuery.on("key_entered", (key, location, distance) => {
     firebaseRef.ref('/locations/' + region + '/' + key).once('value').then(function(snapshot) {
       const values = snapshot.val();
       return dispatch(addNewPlayer({...values, location, distance}));
     })
     .catch((error) => {
       console.log(error.message);
     });
    });
  }
}

export const setCurrentPlayer = (player) => {
  return {
    type: "SET_CURRENT_PLAYER",
    player
  };
}
