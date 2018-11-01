/**
 * IKA — a tool that makes it easier to distribute/collect ETH/ERC20 tokens.
 * Copyright (C) 2018  ICODROPS
 *
 * IKA is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * IKA is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

'use strict';

var fs = require("fs");
var themes = require("./themes.json");

var currentTheme = window.localStorage.getItem("theme");

if (themes[currentTheme] != undefined) {
  setTheme(currentTheme);
} else {
  setTheme("night");
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

function main() {
  var Web3 = require("web3");
  // chain-specific
  var web3 = new Web3("https://mainnet.infura.io/v3/84e0a3375afd4f57b4753d39188311d7");

  var plusEl = document.getElementById("add");
  var setAllAmountEl = document.getElementById("setall-amount-btn");
  var setAllFeeEl = document.getElementById("setall-fee-btn");
  var formEl = document.getElementById("config");
  var firstWalletEl = document.getElementsByClassName("wallet")[0];

  var keyEl = document.getElementsByName("privkey")[0];
  var contractEl = document.getElementsByName("contract")[0];
  var tokenEl = document.getElementById("token");

  var switchEl = document.getElementById("theme-switch");
  switchEl.firstElementChild.className = window.localStorage.getItem("theme");

  var key = "";
  var address = "";
  var contract = {};
  var token = {};

  /**
   * Update variable with the private key from a form value.
   */
  const updateKey = () => {
    key = getKey(keyEl.value);
    return !key ? false : true;
  }


  /**
   * Update variable with the target address, using key from a form value.
   */
  const updateAddress = () => {
    address = web3.eth.accounts.privateKeyToAccount(`${key}`).address;
  }

  /**
   * Update nonce for the address in the form.
   */
  const updateNonce = () => {
    web3.eth.getTransactionCount(address).then(count => {
      document.getElementsByName("nonce")[0].value = count;
    });
  };

  /**
   * Update balance displayed in HTML, using the target address from the
   * previous function. Update token balance if available.
   */
  const updateBalance = () => {
    web3.eth.getBalance(address).then(balance => {
      return new Promise(resolve => {
        document.getElementById("balance").innerText = `ETH: ${web3.utils.fromWei(balance, "ether")}`;
        resolve();
      });
    }).then(() => {
      if (Object.keys(token).length === 0) {
        return;
      }

      var bal = 0;
      contract.methods.balanceOf(address).call().then(tokenBalance => {
        bal = tokenBalance;
        document.getElementById("balance").innerHTML += `<br>${token.symbol}: ${bal / 10 ** token.decimals}`;
      });
    });
  };

  /**
   * Sequentially update key, address and balance.
   */
  const updateKeyBalance = () => {
    if (!updateKey()) return;
    updateAddress();
    updateBalance();
  };

  /**
   * Sequentially update key, address, nonce and balance.
   */
  const updateAll = () => {
    if (!updateKey()) return;
    updateAddress();
    updateNonce();
    updateBalance();
  }

  /**
   * Update suggested gas price in the corresponding HTML element.
   */
  const updateGas = () => {
    web3.eth.getGasPrice().then(price => {
      document.getElementById("gasprice").innerText = `suggested gas price: ${parseFloat(web3.utils.fromWei(price, "gwei")).toFixed(2)} gwei`;
    });
  };

  formEl.onsubmit = () => {
    sendEth(web3, updateKeyBalance, contract, token);

    return false;
  };

  keyEl.addEventListener("input", updateAll);
  document.getElementById("recalculate").addEventListener("click", updateAll);


  // create new input fields on plus clicked
  plusEl.addEventListener("click", () => {
    var row = document.createElement("div");
    row.className = "wallet cards row";
    row.innerHTML = `
      <div class="col-md-1">
      <button class="card remove" type="button">–</button>
      </div>

      <div class="col-md-5">
      <input type="text" class="card address" placeholder="ETH address (0x012345...)" name="address" required />
      </div>

      <div class="col-md-2">
      <input type="number" class="card amount" placeholder="tokens" name="amount" step="0.00000001" min="0" required />
      </div>

      <div class="col-md-2">
      <input type="number" class="card fee" placeholder="fee (gwei)" name="fee" step="1" min="0" required />
      </div>

      <div class="col-md-2 middle">
      <span class="middle">
      </span>
      </div>
      `;

    formEl.insertBefore(row, plusEl.parentElement.parentElement);

    var removes = document.getElementsByClassName("remove");
    removes[removes.length-1].addEventListener("click", () => {
      row.className += " fade-out";
      window.setTimeout(() => {
        formEl.removeChild(row);
      }, 290);
    });

    var inp = row.children[1].firstElementChild;
    inp.addEventListener("input", () => {
      if (Object.keys(contract).length !== 0 && web3.utils.isAddress(inp.value)) {
        contract.methods.balanceOf(inp.value).call().then(bal => {
          row.children[2].firstElementChild.placeholder = bal / 10 ** token.decimals;
        });
      }
    });

    return false;
  });


  firstWalletEl.firstElementChild.firstElementChild.addEventListener("input", () => {
      if (Object.keys(contract).length !== 0 && web3.utils.isAddress(firstWalletEl.firstElementChild.firstElementChild.value)) {
        contract.methods.balanceOf(firstWalletEl.firstElementChild.firstElementChild.value).call().then(bal => {
          firstWalletEl.children[1].firstElementChild.placeholder = bal / 10 ** token.decimals;
        });
      }
  });

  setAllAmountEl.addEventListener("click", () => {
    var amount = document.getElementById("setall-amount").value;
    var amounts = document.querySelectorAll(".amount:not(.success)");

    for (var i = 0; i < amounts.length; i++) {
      amounts[i].value = amount;
    }

    return false;
  });

  setAllFeeEl.addEventListener("click", () => {
    var fee = document.getElementById("setall-fee").value;
    var fees = document.querySelectorAll(".fee:not(.success)");

    for (var i = 0; i < fees.length; i++) {
      fees[i].value = fee;
    }

    return false;
  });

  import("./tokens.js").then(tokens => {
    contractEl.addEventListener("input", () => {
      addr = contractEl.value.trim();
      if (web3.utils.isAddress(addr)) {
        tokens.updateTokenData(addr, web3).then(val => {
          contract = val[0];
          token = val[1];
          updateTokenInfo(token, tokenEl);
          updateKeyBalance();
        });
      } else {
        document.getElementById("token").innerText = "invalid token contract address";
      }
    });
  });

  switchEl.addEventListener("click", () => {
    if (window.localStorage.getItem("theme") == "day") {
      setTheme("night");
      switchEl.firstElementChild.className = "night";
    } else {
      setTheme("day");
      switchEl.firstElementChild.className = "day";
    }
  });

  makeCollapsible();
  addTosModal();

  updateGas();
  window.setInterval(updateGas, 5000);
}

/**
 * Set all the CSS variables, changing the theme. Record it in localStorage.
 * @arg theme {string} - theme name, a name of an object in the themes.json file
 */
function setTheme(theme) {

  window.localStorage.setItem("theme", theme);

  Object.keys(themes[theme]).forEach(k => {
    document.body.style.setProperty(k, themes[theme][k]);
  });
}

/**
 * Get input data and actually send tokens.
 * @arg {web3} web3 - a Web3 instance
 * @arg {function} updateBalance - a function that updates balance in
 * @arg {Object} contract - the web3 contract object
 * @arg {Object} token - object containing token info
 * the corresponding HTML element.
 */
function sendEth(web3, updateBalance, contract, token) {
  getInputData().then(data => {
    if (data == undefined || data.transactions.length == 0) {
      return;
    }
    var confirmations = {};
    if (data.privkey.startsWith("0x")) {
      data.privkey = data.privkey.slice(2);
    }

    var BN = web3.utils.BN;
    var Tx = require('ethereumjs-tx');
    var privateKey = new Buffer(data.privkey, 'hex');

    setWaiting();

    var delay = 0;
    count = parseInt(data.nonce);

    data.transactions.forEach((txn, i, a) => {
      // XXX: to reduce nonce on fail
      window.setTimeout(() => {
        if (web3.utils.isAddress(txn.address)) {
          var call = contract.methods.transfer(txn.address, txn.amount * 10 ** token.decimals);

          // chain-specific
          var tx = new Tx({chainId: 1});
          tx.gasPrice = new BN(web3.utils.toWei(txn.fee, "shannon"));
          tx.value = 0;
          tx.to = contract._address;
          tx.nonce = count++;
          tx.data = call.encodeABI();

          tx.gasLimit = new BN(data.gas);

          tx.sign(privateKey);
          var serializedTx = tx.serialize();


          web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
            .on('receipt', (r) => {
              console.log(r);
              showReceipt(r, txn.address);
              updateBalance();
            }).on("error", (e, r) => {
              console.log(e);
              count--;
              showError(e, txn.address, r);
            });

          if (i == a.length - 1) {
            window.setTimeout(() => {
              document.getElementsByName("nonce")[0].value = count;
            }, 200);
          }
        } else {
          showError(`${txn.address} is not a valid Ethereum address!!!!`, txn.address, null);
        }
      }, delay++ * 400);
    });
  });
}

/**
 * Show an error: make the fields red, add a cross sign at the right.
 * @arg e {string} - error
 * @arg address {string} - the private key of the wallet you want to show error for
 * @arg r {receipt} - the web3 receipt
 */
function showError(e, address, r) {
  const cross = fs.readFileSync("img/failed.svg", "utf8");

  var wallet = getWalletByAddress(address);
  if (!r) {
    wallet.lastElementChild.lastElementChild.innerHTML = `<div class="icon middle">${cross}</div>`;
    wallet.lastElementChild.lastElementChild.title = e;
  } else {
    wallet.lastElementChild.lastElementChild.innerHTML = `<a rel="noopener" target="_blank" class="receipt" href="https://etherscan.io/tx/${r.transactionHash}"><div class="icon middle" alt="${e}">${cross}</div></a>`;
  }

  if (wallet.children.length == 4) {
    for (var i = 0; i <= 2; i++) {
      wallet.children[i].firstElementChild.className += " fail";
        wallet.children[i].firstElementChild.required = true;
        wallet.children[i].firstElementChild.disabled = false;
    }
  } else {
    for (var i = 1; i <= 3; i++) {
      wallet.children[i].firstElementChild.className += " fail";
        wallet.children[i].firstElementChild.required = true;
        wallet.children[i].firstElementChild.disabled = false;
    }
  }
}

/**
 * Show an receipt: make the fields green in case of success, add an etherscan
 * link at the right.
 * @arg r {receipt} - the web3 receipt
 * @arg address {string} - the private key of the wallet you want to show error for
 */
function showReceipt(r, address) {
  if (r.status) {
    const tick = fs.readFileSync("img/external-link.svg", "utf8");
    var wallet = getWalletByAddress(address);
    wallet.lastElementChild.lastElementChild.innerHTML = `<a rel="noopener" target="_blank" class="receipt" href="https://etherscan.io/tx/${r.transactionHash}"><div class="icon middle">${tick}</div></a>`;
    wallet.lastElementChild.lastElementChild.title = "success, click to view on Etherscan";
    if (wallet.children.length == 4) {
      for (var i = 0; i <= 2; i++) {
        wallet.children[i].firstElementChild.required = "false";
        wallet.children[i].firstElementChild.disabled = "true";
        wallet.children[i].firstElementChild.className += " success";
      }
    } else {
      for (var i = 1; i <= 3; i++) {
        wallet.children[i].firstElementChild.required = "false";
        wallet.children[i].firstElementChild.disabled = "true";
        wallet.children[i].firstElementChild.className += " success";
      }
    }
    wallet.className += " success";
  } else {
    const cross = fs.readFileSync("img/failed.svg", "utf8");
    getWalletByAddress(address).lastElementChild.lastElementChild.innerHTML = `<a rel="noopener" target="_blank" class="receipt" href="https://etherscan.io/tx/${r.transactionHash}"><div class="icon">${cross}</div></a>`;
  }
}

/**
 * Make all (except successful) fields disabled, add a loading spinner at the right.
 */
function setWaiting() {
  const clock = fs.readFileSync("img/loading.svg", "utf8");
  document.querySelectorAll(".address:not([disabled])").forEach(childEl => {
    el = childEl.parentElement.parentElement;
    el.lastElementChild.lastElementChild.innerHTML = `<div class="icon spin middle">${clock}</div>`;

    if (el.children.length == 4) {
      for (var i = 0; i <= 2; i++) {
        el.children[i].firstElementChild.required = "false";
        el.children[i].firstElementChild.disabled = "true";
      }
    } else {
      for (var i = 1; i <= 3; i++) {
        el.children[i].firstElementChild.required = "false";
        el.children[i].firstElementChild.disabled = "true";
      }
    }
  });
}

/**
 * Get data from the form, convert it to a usable format.
 */
function getInputData() {
  return new Promise(resolve => {
    var data = new FormData(document.getElementById("config"));
    var parsed = {transactions: []};
    var txn = {};
    var addrs = {};

    var i = 0;
    for (var pair of data) {
      if (pair[1] == "") {
        continue;
      }

      if (["address", "amount", "fee"].includes(pair[0])) {
        if (pair[0] == "address" && Object.keys(txn).length != 0) {
          parsed.transactions.push(txn);
          txn = {};
        }

        txn[pair[0]] = pair[1];
      } else {
        parsed[pair[0]] = pair[1];
      }

      if (pair[0] == "address") {
        addrs[pair[1]] == undefined ? addrs[pair[1]] = 1 : addrs[pair[1]] += 1;
      }
    }

    for (var addr in addrs) {
      if (addrs[addr] && addrs[addr] > 1) {
        alert(`found a duplicate entry: ${addr}, please remove one first`);
        resolve(undefined);
      }
    }

    if (txn.address != undefined) {
      parsed.transactions.push(txn);
    }
    resolve(parsed);
  });
}

/**
 * Get a wallet element by its address.
 * @arg address {string} - the address
 */
function getWalletByAddress(address) {
  var nodes = document.querySelectorAll("input.address:not(.success)");
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].value == address) {
      return nodes[i].parentElement.parentElement;
    }
  }
  return document.createElement("input");
}

/**
 * Makes a div with a link with class "collapsible" collapsible.
 * The div must have no class and must have exactly two children: a link and
 * a div with no class.
 */
function makeCollapsible() {
  var els = document.getElementsByClassName("collapsible");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];

    el.parentElement.className += "collapsible-container";

    el.addEventListener("click", () => {
      if (el.parentElement.lastElementChild.className == "collapsed") {
        el.parentElement.lastElementChild.className = "fade-in";
        el.className = "collapsible on";
      } else {
        el.parentElement.lastElementChild.className = "fade-out";
        window.setTimeout(() => {
          el.parentElement.lastElementChild.className = "collapsed";
        }, 290);
        el.className = "collapsible off";
      }
    });
  }
}

/**
 * If the key doesn't start with 0x, append it to its beginning.
 * @arg key {string}
 */
function getKey(key) {
  if (!key.startsWith("0x")) {
    key = "0x" + key;
  }
  if (key.length != 66) {
    return false;
  }

  return key;
}

/**
 * Update token info in a HTML element.
 * @arg {Object} token — object containing token info
 * @arg {Object} tokenEl - the element to update info inside
 */
function updateTokenInfo(token, tokenEl) {
  tokenEl.innerText = `${token.name} (${token.symbol}), ${token.decimals} decimals`;
}

/**
 * Use tingle.js to make a modal for Terms of Service.
 */
function addTosModal() {
  var tingle = require("tingle.js");
  var tosEl = document.getElementById("tos");

  var modal = new tingle.modal({
    footer: true,
    closeMethods: ['overlay', 'escape']
  });

  modal.setContent(require("../disclaimer.html"));
  modal.addFooterBtn('done', 'card tos', function() {
    modal.close();
  });

  tosEl.onclick = () => {
    modal.open();
    return false;
  };
}
