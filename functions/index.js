
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
                switch (command[0]) {
                    case '/help':
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Atenção, todos os valores devem ser inteiros. Para iniciar um novo orçamento digite:\n/init=1000\nPara inserir um gasto digite:\n/sub=10\nPara adicionar um ganho digite:\n/add=10\nPara verificar o orçamento diário digite:\n/daily\nPara verificar o status do orçamento atual digite:\n/status`
                        })
                    case '/daily':
                        var lastEntryDate = budget.lastEntryDate.toDate().toLocaleString('pt-BR')
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text:`Último valor diário caculado foi em ${lastEntryDate}, o valor disponível para esse dia é de: R$${budget.dailyValue}`
                        })
                    case '/status':
                        var sub = budget.initialValue - budget.currentValue;
                        var waste = Math.trunc(sub*Math.pow(10, 2))/Math.pow(10, 2)
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text:`O valor atual do orçamento é de R$${budget.currentValue}, de um valor inicial de R$${budget.initialValue}. Total gasto até agora é de R$${waste}.`
                        })
                    default:
                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Desculpe o comando ${command[0]} não existe ou está faltando algum parâmetro, digite /help para obter a lista dos comandos disponíveis`
                        });
                }
            } else if (command.length == 2) {
                switch (command[0]) {
                    case '/init':
                        if (isNaN(command[1])) {
                            return res.status(200).send({
                                method: 'sendMessage',
                                chat_id,
                                text: `Desculpe o comando ${command[0]} deve poussuir um valor numérico válido, ex: 10`
                            });
                        } 
                        budget.initialValue = command[1];
                        budget.currentValue = command[1];
                        budget.dailyValue = command[1]/30;
                        budget.dailyValue = Math.trunc(budget.dailyValue*Math.pow(10, 2))/Math.pow(10, 2)
                        budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                        await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);

                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Valor inicial do orçamento atualizado para R$${command[1]}`
                        });
                    case '/sub':
                        if (isNaN(command[1])) {
                            return res.status(200).send({
                                method: 'sendMessage',
                                chat_id,
                                text: `Desculpe o comando ${command[0]} deve poussuir um valor numérico válido, ex: 10`
                            });
                        }

                        var messageDate = new Date(messageTimestamp * 1000);
                        var budgetLastEntryDate = budget.lastEntryDate.toDate();

                        if (datesAreOnSameDay(messageDate, budgetLastEntryDate)) {
                            budget.currentValue = budget.currentValue - command[1];
                            budget.dailyValue = budget.dailyValue - command[1];
                            budget.dailyValue = Math.trunc(budget.dailyValue*Math.pow(10, 2))/Math.pow(10, 2)
                            budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                            await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);
                        } else {
                            budget.currentValue = budget.currentValue - command[1];
                            budget.dailyValue = budget.initialValue/30;
                            budget.dailyValue = budget.dailyValue - command[1];
                            budget.dailyValue = Math.trunc(budget.dailyValue*Math.pow(10, 2))/Math.pow(10, 2)
                            budget.lastEntryDate = admin.firestore.Timestamp.fromDate(new Date());

                            await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);
                        }

                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Valor total restante do orçamento é de R$${budget.currentValue}. Valor restante diário é de R$${budget.dailyValue}.`
                        });
                    case '/add':
                        if (isNaN(command[1])) {
                            return res.status(200).send({
                                method: 'sendMessage',
                                chat_id,
                                text: `Desculpe o comando ${command[0]} deve poussuir um valor numérico válido, ex: 10`
                            });
                        }
                        budget.currentValue = budget.currentValue + command[1]
                        
                        await admin.firestore().collection('budget').doc(budgets.docs[0].id).set(budget);

                        return res.status(200).send({
                            method: 'sendMessage',
                            chat_id,
                            text: `Valor total restante do orçamento é de R$${budget.currentValue}. Valor restante diário é de R$${budget.dailyValue}.`
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
            return res.status(200).send({ status: 'não é um comando' });
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
            text: `Olá ${first_name}, criei um novo orçamento para este grupo. digite /help para obter a lista de comandos e informações sobre como usar o bot`
        })
    }
    return res.status(200).send({ status: 'mensagem do telegram comum' });
  }

  return res.status(200).send({ status: 'not a telegram message' })
})
// this is the only function it will be published in firebase
exports.dailyFinancesBot = functions.https.onRequest(app)