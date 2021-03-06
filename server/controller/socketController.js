/**
* Controlls socket events between server and client.
*
* @author   Filip Garamvölgyi
* @created  2020-05-03
*/
const {getList, setList} = require('./../integration/dbIntegration.js');
const DELETE_TIMEOUT = 1000*60*60; // 1 hour

/**
* Initiates the io socket interactions with the user.
*
* @param io  io socket component of a server.
*/
const ioInit = (io, lists) => {
  io.on('connection', (socket) => {
    socket.on('add item', (item) => {
      console.log(item);
      
      addToList(item, io, lists);
    });
    socket.on('remove item', (item) => {
      removeFromList(item, io, lists);
    });
  });
};

/**
 * Adds a single item to the list.
 * 
 * @param  item   item to add. {item, id, color, textColor}
 * @param  io     io socket of the web server.
 * @param  lists  contains all of the lists that currently are
 *                cached.
 */
const addToList = async (item, io, lists) => {
  console.log('add to list');
  
  const o = JSON.parse(item);
  if(lists[o.id]){ resetListClear(o.id, lists); }
  else {
    await getListInDB(o.id, lists)
  }
  itemExists(o, lists); 
  lists[o.id].items = [{
    item: o.item, 
    color: o.color, 
    textColor: o.textColor,
    created: Date.parse(new Date())
  }].concat(lists[o.id].items);
  updateListInDB(o.id, lists[o.id]);
  io.emit(`${o.id}`, JSON.stringify(lists[o.id]));
};

/**
 * Looks for a item in a list.
 * 
 * @param  item   item to look for in the list. {item, id} 
 * @param  lists  contains all of the lists that currently are
 *                cached.
 */
const itemExists = (item, lists) => {
  lists[item.id].items = lists[item.id]
    .items.filter(e => e.item != item.item);
};

/**
 * Removes a single item from a list.
 * 
 * @param  item   item to remove. {item, id}
 * @param  io     io socket of the web server.
 * @param  lists  contains all of the lists that currently are
 *                cached.
 */
const removeFromList = async (item, io, lists) => {
  const o = JSON.parse(item);
  try {
    if(lists[o.id]){
      resetListClear(o.id, lists);
    } else await getListInDB(o.id, lists);
    itemExists(o, lists);
    updateListInDB(o.id, lists[o.id]);
    io.emit(`${o.id}`, JSON.stringify(lists[o.id]));
  } catch (error) {
    console.error(error);
    console.log('content of list: ');
    console.log(lists[o.id]);
    console.log('content of item: ');
    console.log(o);
  }
};

module.exports = ioInit;

const resetListClear = (id, lists) => {
  console.log(`Deletion of ${id} cancelled`);
  lists[id].deletion =  clearList(id, lists);
  clearTimeout(lists[id].deletion, lists);
};
const clearList = (id, lists) => {
  console.log(`Deletion of ${id} set to T - ${DELETE_TIMEOUT}`);
  setTimeout(
    () => {console.log(`Deleting ${id}`); delete lists[id]},
    DELETE_TIMEOUT
  );
};

const updateListInDB = (id, list) => 
  setList(id, {name: list.name, items: list.items});

const getListInDB = async (id, lists) => {
  try {
    lists[id] = {items: []};
    const doc = await getList(id);
    lists[id]['name'] = doc.name;
    lists[id]['items'] = doc.items;
    lists[id].deletion = clearList(id, lists);
  } catch (error) {
    throw error;
  }
};