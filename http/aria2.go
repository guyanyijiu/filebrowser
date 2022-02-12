package http

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/go-resty/resty/v2"
)

var aria2RestyClient = resty.New()

const aria2ResponseErr = `{"id":"%s","jsonrpc":"2.0","error":{"code":1,"message":"%s"}}`
const aria2Url = "http://127.0.0.1:6800/jsonrpc"

type aria2Request struct {
	Id string `json:"id"`
}

var aria2Handler = func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	code, err := withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		return 0, nil
	})(w, r, d)

	reqBody, err := io.ReadAll(r.Body)
	if err != nil {
		return http.StatusBadRequest, err
	}
	req := &aria2Request{}
	err = json.Unmarshal(reqBody, req)
	if err != nil {
		return http.StatusBadRequest, err
	}
	if code != 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Sprintf(aria2ResponseErr, req.Id, http.StatusText(http.StatusUnauthorized))))
		return 0, nil
	}

	resp, err := aria2RestyClient.R().
		SetHeader("Content-Type", r.Header.Get("Content-Type")).
		SetHeader("User-Agent", r.Header.Get("User-Agent")).
		SetHeader("Connection", r.Header.Get("Connection")).
		SetBody(reqBody).
		Post(aria2Url)

	if err != nil {
		code = errToStatus(err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(fmt.Sprintf(aria2ResponseErr, req.Id, http.StatusText(code))))
		return 0, nil
	}

	for k, vs := range resp.Header() {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(resp.StatusCode())
	w.Write(resp.Body())

	return 0, nil
}
