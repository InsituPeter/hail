import http from  "k6/http"
import {sleep } from "k6"
import crypto  from "k6/crypto"
import encoding from "k6/encoding"

export function loginUser(baseUrl, email, password){
    const res=http.post(`${baseUrl}/api/v1/auth/login`,
                         JSON.stringify({email, password}),
                          {headers:{"Content-Type": "application/json"}}
                        
                        
                        )
    return res.json("data.accessToken")
}

export function signWebhook(body, secret){
    return crypto.hmac("sha512", secret, body, "hex")
}

export function randomItems(arr){
    return arr[Math.floor(Math.random() *arr.length)]
}

export function sleepBetween(min, max){
    sleep(min + Math.random()* (max-min))
}