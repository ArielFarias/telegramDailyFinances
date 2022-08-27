
const functions = require("firebase-functions");
const admin = require('firebase-admin');
const cors = require('cors')
const express = require('express')

admin.initializeApp(functions.config().firebase);

// give us the possibility of manage request properly
const app = express()

// Automatically allow cross-origin requests
app.use(cors({ origin: true }))

// our single entry point for every message
app.post('/', async (req, res) => {
    /*
    You can put the logic you want here
    the message receive will be in this
    https://core.telegram.org/bots/api#update
    */
    var isTelegramMessage = req.body
                            && req.body.message
                            && req.body.message.chat
                            && req.body.message.chat.id
                            && req.body.message.from
                            && req.body.message.from.first_name

    var datesAreOnSameDay = (first, second) =>
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  if (isTelegramMessage) {
    var chat_id = req.body.message.chat.id;
    var { first_name } = req.body.message.from;
    var message = req.body.message.text;
    var messageTimestamp = req.body.message.date

    var budgets = await admin.firestore().collection('budget').where('id', '==', chat_id).limit(1).get();
    if (budgets.docs.length > 0) {
        var budget = budgets.docs[0].data();
        if (message.startsWith('/', 0)) {
            var command = message.split('=')
            if (command.length == 1) {
                console.log(`comando simples ${command[0]}`)
                switch (command[0]) {
                    case '/help':
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Estes são os comandos disponiveis:\n/help {Descreve a lista de comandos disponíveis}\n/initalValue=100 {define o valor total do orçamento}\n/subtract=10 {subtrai 10 do valor total inicial e soma 10 no valor gasto diário}\n/daily {informa o valor gasto no dia}\n/current {informa o valor disponível no orçamento do mês}`
                        })
                    case '/daily':
                        var lastEntryDate = new Date(budget.lastEntryDate * 1000).toGMTString();
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text:`Último valor diário caculado foi em ${lastEntryDate}, o valor disponível para esse dia é de: ${budget.dailyValue} reais`
                        })
                    case '/current':
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text:`O valor atual do orçamento é de ${budget.currentValue} reais, de um valor inicial de ${budget.initialValue}. Total gasto até agora é de ${budget.initialValue - budget.currentValue}.`
                        })
                    default:
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Desculpe o comando ${command[0]} não existe, digite /help para obter a lista dos comandos disponíveis`
                        });
                }
            } else if (command.length == 2) {
                switch (command[0]) {
                    case '/initialValue':
                        if (isNaN(command[1])) {
                            return res.status(200).send({
                                method: 'sendMessage',
                                chat_id,
                                text: `Desculpe o comando ${command[0]} deve poussuir um valor no numérico válido, ex: 10`
                            });
                        } 
                        budget.initialValue = command[1];
                        budget.currentValue = command[1];
                        budget.dailyValue = command[1]/30;
                        budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                        await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);

                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Valor inicial do orçamento atualizado para ${command[1]} reais`
                        });
                    case '/subtract':
                        if (isNaN(command[1])) {
                            return res.status(200).send({
                                method: 'sendMessage',
                                chat_id,
                                text: `Desculpe o comando ${command[0]} deve poussuir um valor no numérico válido, ex: 10`
                            });
                        }

                        var messageDate = new Date(messageTimestamp * 1000);
                        var budgetLastEntryDate = new Date(budget.lastEntryDate * 1000);

                        if (datesAreOnSameDay(messageDate, budgetLastEntryDate)) {
                            budget.currentValue = budget.currentValue - command[1];
                            budget.dailyValue = budget.dailyValue - command[1];
                            budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                            await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);
                        } else {
                            budget.currentValue = budget.currentValue - command[1];
                            budget.dailyValue = command[1]/30;
                            budget.dailyValue = budget.dailyValue - command[1];
                            budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                            await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);
                        }

                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Valor total restante do orçamento é de ${budget.currentValue} reais. Valor restante diário é de ${budget.dailyValue}.`
                        });
                    default:
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Desculpe o comando ${command[0]} não existe, digite /help para obter a lista dos comandos disponíveis`
                        });
                }
            }
        } else {
            console.log('return')
            return res.status(200);
        }
    } else {
        await admin.firestore().collection('budget').add({
            id: chat_id,
            currentValue: 0,
            initialValue: 0,
            dailyValue: 0,
            lastEntryDate: admin.firestore.Timestamp.fromDate(new Date())
        });
        return res.status(200).send({
            method: 'sendMessage',
            chat_id,
            text: `Olá ${first_name}, criei um novo orçamento para este grupo. O valor total do orçamento é divido pelo número de dias restantes do mês (baseado em um mês de 30 dias). A cada subtração irei informar o valor total restante do orçamento e o valor diário gasto em relação ao disponível para o dia.\nEstes são os comandos disponiveis:\n/help {Descreve a lista de comandos disponíveis}\n/initalValue=100 {define o valor total do orçamento}\n/subtract=10 {subtrai 10 do valor total inicial e soma 10 no valor gasto diário}\n/daily {informa o valor gasto no dia}\n/current {informa o valor disponível no orçamento do mês}`
        })
    }
  }

  return res.status(200).send({ status: 'not a telegram message' })
})
// this is the only function it will be published in firebase
exports.dailyFinancesBot = functions.https.onRequest(app)